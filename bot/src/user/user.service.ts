/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Candidate, CandidateDocument } from '../game/schemas/candidate.schema';
import { WithdrawalRequest, WithdrawalRequestDocument } from './schemas/withdrawal.schema';
import { Giveaway, GiveawayDocument } from '../game/schemas/giveaway.schema';
import { NIGERIAN_STATES } from '../data/nigerian-states.data';
import { WalletService } from 'src/wallet/wallet.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
    @InjectModel(WithdrawalRequest.name)
    private withdrawalModel: Model<WithdrawalRequestDocument>,
    @InjectModel(Giveaway.name)
    private giveawayModel: Model<GiveawayDocument>,
  ) {}

  /**
   * Find existing user or create a new one with default values.
   */
  async findOrCreateByTelegramId(
    telegramId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    referredByCode?: string,
  ): Promise<UserDocument> {
    let user = await this.userModel.findOne({ telegramId }).exec();

    if (!user) {
      let referrerId = '';
      if (referredByCode) {
        // Try finding referrer by referralCode
        const referrer = await this.userModel
          .findOne({ referralCode: referredByCode })
          .exec();
        if (referrer && referrer.telegramId !== telegramId) {
          referrerId = referrer.telegramId;
        }
      }

      const [newSVMWallet, newEVMWallet] = await Promise.all([
        this.walletService.createSVMWallet(),
        this.walletService.createEVMWallet(),
      ]);

      const [encryptedSVMWallet, encryptedEVMWallet] = await Promise.all([
        this.walletService.encryptSVMWallet(
          process.env.DEFAULT_WALLET_PIN!,
          newSVMWallet.privateKey,
        ),
        this.walletService.encryptEVMWallet(
          process.env.DEFAULT_WALLET_PIN!,
          newEVMWallet.privateKey,
        ),
      ]);

      user = await this.userModel.create({
        telegramId,
        username: username || '',
        firstName: firstName || '',
        lastName: lastName || '',
        svmWalletAddress: newSVMWallet.address,
        evmWalletAddress: newEVMWallet.address,
        svmWalletDetails: encryptedSVMWallet.json,
        evmWalletDetails: encryptedEVMWallet.json,
        referralCode: `ref_${telegramId}`,
        referredBy: referrerId,
        onboardingComplete: false,
      });
    } else if (!user.referralCode) {
      // Migrate legacy user on the fly
      user.referralCode = `ref_${telegramId}`;
      await user.save();
    }

    return user;
  }

  /**
   * Get user profile by Telegram ID.
   */
  async getUserByTelegramId(telegramId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ telegramId }).exec();
  }

  /**
   * Complete the onboarding process — validates state and candidate selections,
   * then stores them on the user record.
   */
  async completeOnboarding(
    telegramId: string,
    data: {
      state: string;
      presidentialCandidateId: string;
      gubernatorialCandidateId?: string;
    },
  ): Promise<UserDocument> {
    // Validate state
    if (!NIGERIAN_STATES.includes(data.state as any)) {
      throw new BadRequestException(`Invalid state: ${data.state}`);
    }

    // Validate presidential candidate exists
    const presidential = await this.candidateModel
      .findById(data.presidentialCandidateId)
      .exec();
    if (!presidential || presidential.role !== 'PRESIDENT') {
      throw new BadRequestException('Invalid presidential candidate');
    }

    let validGubernatorialId: string | null = null;
    if (data.gubernatorialCandidateId) {
      // Validate gubernatorial candidate exists and matches selected state
      const gubernatorial = await this.candidateModel
        .findById(data.gubernatorialCandidateId)
        .exec();
      if (!gubernatorial || gubernatorial.role !== 'GOVERNOR') {
        throw new BadRequestException('Invalid gubernatorial candidate');
      }
      if (gubernatorial.state !== data.state) {
        throw new BadRequestException(
          'Gubernatorial candidate does not match selected state',
        );
      }
      validGubernatorialId = gubernatorial._id.toString();
    }

    // Update user record
    const user = await this.userModel
      .findOneAndUpdate(
        { telegramId },
        {
          state: data.state,
          presidentialCandidate: data.presidentialCandidateId,
          gubernatorialCandidate: validGubernatorialId,
          onboardingComplete: true,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If referred by someone, credit them 500 bonus points upon referee completion
    if (user.referredBy) {
      await this.userModel
        .findOneAndUpdate(
          { telegramId: user.referredBy },
          { $inc: { score: 500 } },
        )
        .exec();
    }

    return user;
  }

  async getUserProfile(telegramId: string) {
    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) return null;

    let presidentialCandidate = null;
    let gubernatorialCandidate = null;

    if (user.presidentialCandidate) {
      presidentialCandidate = await this.candidateModel
        .findById(user.presidentialCandidate)
        .exec();
    }
    if (user.gubernatorialCandidate) {
      gubernatorialCandidate = await this.candidateModel
        .findById(user.gubernatorialCandidate)
        .exec();
    }

    // Get referral stats
    const totalReferred = await this.userModel
      .countDocuments({ referredBy: telegramId })
      .exec();
    const subscribedReferred = await this.userModel
      .countDocuments({ referredBy: telegramId, isSubscriber: true })
      .exec();

    const pointsWithdrawn = user.referralPointsWithdrawn || 0;
    const pointsPending = user.referralPointsPending || 0;
    const pointsAvailable = Math.max(0, subscribedReferred - pointsWithdrawn - pointsPending);

    // Fetch friend details
    const friends = await this.userModel
      .find(
        { referredBy: telegramId },
        'username firstName lastName isSubscriber onboardingComplete score',
      )
      .exec();

    return {
      user,
      presidentialCandidate,
      gubernatorialCandidate,
      botLink: this.configService.get<string>(
        'BOT_LINK',
        't.me/allbotTestsbot',
      ),
      referralStats: {
        totalReferred,
        subscribedReferred,
        pointsWithdrawn,
        pointsPending,
        pointsAvailable,
        friends,
      },
    };
  }

  async getNativeTokenPrice(
    symbol: 'SOL' | 'ETH' | 'BNB' | 'POL',
  ): Promise<number> {
    try {
      const ticker = symbol === 'POL' ? 'POLUSDT' : `${symbol}USDT`;
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`,
      );
      const data = await res.json();
      if (data && data.price) {
        return parseFloat(data.price);
      }
    } catch (err) {
      console.error(`Failed to fetch price for ${symbol} from Binance:`, err);
    }

    const fallbacks = {
      SOL: 150.0,
      ETH: 3500.0,
      BNB: 580.0,
      POL: 0.65,
    };
    return fallbacks[symbol] || 1.0;
  }

  async subscribeUser(
    telegramId: string,
    network: string,
    tokenType: string,
  ): Promise<{ user: UserDocument; signature: string }> {
    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isSubscriber) {
      throw new BadRequestException('User is already subscribed');
    }

    const pin = process.env.DEFAULT_WALLET_PIN;
    if (!pin) {
      throw new BadRequestException('Wallet configuration is missing');
    }

    let signature = '';

    if (network === 'solana') {
      const adminSolanaAddress = process.env.ADMIN_DEAFULT_WALLET_SOLANA;
      if (!adminSolanaAddress) {
        throw new BadRequestException('Solana admin address not configured');
      }

      if (!user.svmWalletDetails) {
        throw new BadRequestException('User Solana wallet not found');
      }

      const decrypted = await this.walletService.decryptSVMWallet(
        pin,
        user.svmWalletDetails,
      );
      const privateKey = decrypted.privateKey;

      const rpc = process.env.SOLANA_RPC;

      if (tokenType === 'usdc') {
        const usdcAddress = process.env.USDC_SOLANA;

        if (!usdcAddress) {
          throw new BadRequestException(
            'Solana USDC token address not configured',
          );
        }
        const res = await this.walletService.transferSPLToken(
          privateKey,
          adminSolanaAddress,
          10,
          usdcAddress,
          rpc,
          6,
          'Tele-Vote Premium Subscription',
        );
        signature = res.signature as string;
      } else {
        const price = await this.getNativeTokenPrice('SOL');
        const solAmount = 10 / price;
        const res = await this.walletService.transferSOL(
          privateKey,
          adminSolanaAddress,
          solAmount,
          rpc,
          'Tele-Vote Premium Subscription',
        );
        signature = res.signature as string;
      }
    } else {
      const adminEVMAddress = process.env.ADMIN_DEAFULT_WALLET_EVM;
      if (!adminEVMAddress) {
        throw new BadRequestException('EVM admin address not configured');
      }

      if (!user.evmWalletDetails) {
        throw new BadRequestException('User EVM wallet not found');
      }

      const decrypted = await this.walletService.decryptEVMWallet(
        pin,
        user.evmWalletDetails,
      );
      const privateKey = decrypted.privateKey;

      let rpc = '';
      let usdcAddress = '';
      let priceSymbol: 'ETH' | 'BNB' | 'POL' = 'ETH';

      if (network === 'ethereum') {
        rpc = process.env.ETHEREUM_RPC;
        usdcAddress = process.env.USDC_ETHEREUM;
        priceSymbol = 'ETH';
      } else if (network === 'bsc') {
        rpc = process.env.BSC_RPC;
        usdcAddress = process.env.USDC_BSC;
        priceSymbol = 'BNB';
      } else if (network === 'base') {
        rpc = process.env.BASE_RPC;
        usdcAddress = process.env.USDC_BASE;
        priceSymbol = 'ETH';
      } else if (network === 'polygon') {
        rpc = process.env.POLYGON_RPC;
        usdcAddress = process.env.USDC_POLYGON;
        priceSymbol = 'POL';
      } else if (network === 'arbitrum') {
        rpc = process.env.ARBITRUM_RPC;
        usdcAddress = process.env.USDC_ARBITRUM;
        priceSymbol = 'ETH';
      } else {
        throw new BadRequestException(`Unsupported EVM network: ${network}`);
      }

      if (tokenType === 'usdc') {
        if (!usdcAddress) {
          throw new BadRequestException(
            `USDC address not configured for network ${network}`,
          );
        }
        const res = await this.walletService.transferEVMToken(
          privateKey,
          adminEVMAddress,
          10,
          rpc,
          usdcAddress,
        );
        signature = res.hash as string;
      } else {
        const price = await this.getNativeTokenPrice(priceSymbol);
        const nativeAmount = 10 / price;
        const res = await this.walletService.transferNativeEVMToken(
          privateKey,
          adminEVMAddress,
          nativeAmount,
          rpc,
          'Tele-Vote Premium Subscription',
        );
        signature = res.hash as string;
      }
    }

    user.isSubscriber = true;
    await user.save();

    return { user, signature };
  }

  private async loadAndConvertImage(
    imageUrl: string,
    loadImageFn: any,
  ): Promise<any> {
    if (!imageUrl) return null;
    try {
      let imageBuffer: Buffer;
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(';base64,')[1];
        if (!base64Data) return null;
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      }

      // Convert image format to PNG buffer via Sharp
      const sharp = require('sharp');
      const pngBuffer = await sharp(imageBuffer).png().toBuffer();
      return await loadImageFn(pngBuffer);
    } catch (err: any) {
      console.error(`Failed to convert and load image:`, err.message);
      return null;
    }
  }

  async generateShareCard(telegramId: string): Promise<Buffer> {
    const profile = await this.getUserProfile(telegramId);
    if (!profile) {
      throw new BadRequestException('User profile not found');
    }

    const { user, presidentialCandidate, gubernatorialCandidate } = profile;

    // Load canvas dynamically to avoid errors in environments where it might not compile
    let createCanvas;
    let loadImage;
    try {
      const canvasPkg = require('canvas');
      createCanvas = canvasPkg.createCanvas;
      loadImage = canvasPkg.loadImage;
    } catch (err: any) {
      throw new BadRequestException(
        'Canvas graphics generation is not supported on this host: ' +
          err.message,
      );
    }

    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');

    // 1. Draw a beautiful Nigerian gradient background (Green - White - Green)
    const gradient = ctx.createLinearGradient(0, 0, 800, 0);
    gradient.addColorStop(0, '#008753'); // Green
    gradient.addColorStop(0.35, '#008753');
    gradient.addColorStop(0.5, '#ffffff'); // White
    gradient.addColorStop(0.65, '#008753');
    gradient.addColorStop(1, '#008753'); // Green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 450);

    // Overlay dark transparent card in center for readability (Black themed)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 40, 700, 370, 20);
    } else {
      ctx.rect(50, 40, 700, 370);
    }
    ctx.fill();

    // 2. Branded Header (White title)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TELE-VOTE 2027', 370, 85);

    // Manually draw Nigerian flag (Green-White-Green) next to title
    const drawFlag = (x: number, y: number, w: number, h: number) => {
      const colW = w / 3;
      ctx.fillStyle = '#008753'; // Green
      ctx.fillRect(x, y, colW, h);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(x + colW, y, colW, h);
      ctx.fillStyle = '#008753'; // Green
      ctx.fillRect(x + 2 * colW, y, colW, h);
    };
    drawFlag(505, 62, 36, 24);

    // 3. User info
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    const displayName = user.firstName
      ? `${user.firstName} ${user.lastName}`.trim()
      : `@${user.username || 'User'}`;
    ctx.fillText(`Voter: ${displayName}`, 400, 125);

    // Draw thin muted divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(150, 142);
    ctx.lineTo(650, 142);
    ctx.stroke();

    // Load images asynchronously in backend using the Sharp helper
    let presImg: any = null;
    let govImg: any = null;

    if (presidentialCandidate && presidentialCandidate.imageUrl) {
      presImg = await this.loadAndConvertImage(
        presidentialCandidate.imageUrl,
        loadImage,
      );
    }

    if (gubernatorialCandidate && gubernatorialCandidate.imageUrl) {
      govImg = await this.loadAndConvertImage(
        gubernatorialCandidate.imageUrl,
        loadImage,
      );
    }

    // Helper to draw candidate badge on the card (Green, White, Black accents)
    const drawBadge = (
      cand: any,
      img: any,
      cx: number,
      cy: number,
      radius: number,
      roleLabel: string,
      candName: string,
    ) => {
      ctx.save();
      // Draw shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Outer circle (Brand Green)
      ctx.fillStyle = '#008753';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle border (White)
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
      ctx.stroke();

      if (cand) {
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            img,
            cx - (radius - 4),
            cy - (radius - 4),
            (radius - 4) * 2,
            (radius - 4) * 2,
          );
          ctx.restore();
        } else {
          // Draw initials (White text inside Green badge)
          const initials = cand.name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, cx, cy);
        }
      } else {
        // Placeholder circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
      }
      ctx.restore();

      // Labels below the badge
      ctx.fillStyle = '#b0b0b0'; // Muted role label
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(roleLabel, cx, cy + radius + 22);

      ctx.fillStyle = '#ffffff'; // White candidate name
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(candName, cx, cy + radius + 42);
    };

    // Draw Presidential Candidate (Left)
    drawBadge(
      presidentialCandidate,
      presImg,
      250,
      215,
      45,
      'PRESIDENTIAL CANDIDATE',
      presidentialCandidate ? presidentialCandidate.name : 'Not Selected',
    );

    // Draw Gubernatorial Candidate (Right)
    drawBadge(
      gubernatorialCandidate,
      govImg,
      550,
      215,
      45,
      `GOVERNOR CHOICE (${user.state || 'N/A'})`,
      gubernatorialCandidate ? gubernatorialCandidate.name : 'Not Selected',
    );

    // Draw thin muted divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(250, 345);
    ctx.lineTo(550, 345);
    ctx.stroke();

    // 5. User score & Invite
    ctx.fillStyle = '#008753'; // Brand Green
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      `Total Tap Contribution: ${user.score.toLocaleString()} PTS`,
      400,
      375,
    );

    const botLink = this.configService.get<string>(
      'BOT_LINK',
      't.me/allbotTestsbot',
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `Join my movement: ${botLink}?start=${user.referralCode || 'ref_' + telegramId}`,
      400,
      402,
    );

    return canvas.toBuffer('image/png');
  }

  async adminSearchUserByUsername(username: string): Promise<any> {
    const user = await this.userModel
      .findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
      .exec();
    if (!user) return null;

    let presidentialCandidate = null;
    let gubernatorialCandidate = null;

    if (user.presidentialCandidate) {
      presidentialCandidate = await this.candidateModel
        .findById(user.presidentialCandidate)
        .exec();
    }
    if (user.gubernatorialCandidate) {
      gubernatorialCandidate = await this.candidateModel
        .findById(user.gubernatorialCandidate)
        .exec();
    }

    const friends = await this.userModel
      .find(
        { referredBy: user.telegramId },
        'username firstName lastName isSubscriber onboardingComplete score',
      )
      .exec();

    return {
      user,
      presidentialCandidate,
      gubernatorialCandidate,
      friends,
    };
  }

  async adminGetSubscribers(): Promise<UserDocument[]> {
    return this.userModel
      .find({ isSubscriber: true })
      .sort({ updatedAt: -1 })
      .exec();
  }

  // --- USER WITHDRAWALS ---

  async submitWithdrawalRequest(
    telegramId: string,
    points: number,
    walletAddress: string,
    chain: 'solana' | 'evm',
  ): Promise<WithdrawalRequestDocument> {
    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isSubscriber) {
      throw new BadRequestException('Only premium subscribers can request withdrawals');
    }

    if (points <= 0) {
      throw new BadRequestException('Points must be greater than zero');
    }

    const subscribedReferred = await this.userModel
      .countDocuments({ referredBy: telegramId, isSubscriber: true })
      .exec();

    const pointsWithdrawn = user.referralPointsWithdrawn || 0;
    const pointsPending = user.referralPointsPending || 0;
    const pointsAvailable = Math.max(0, subscribedReferred - pointsWithdrawn - pointsPending);

    if (points > pointsAvailable) {
      throw new BadRequestException(`Insufficient points. You only have ${pointsAvailable} points available.`);
    }

    const request = await this.withdrawalModel.create({
      telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      points,
      walletAddress,
      chain,
      status: 'PENDING',
    });

    user.referralPointsPending = (user.referralPointsPending || 0) + points;
    await user.save();

    return request;
  }

  async getUserWithdrawals(telegramId: string): Promise<WithdrawalRequestDocument[]> {
    return this.withdrawalModel
      .find({ telegramId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // --- ADMIN WITHDRAWALS ---

  async adminGetWithdrawalRequests(): Promise<WithdrawalRequestDocument[]> {
    return this.withdrawalModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async adminApproveWithdrawal(requestId: string, txHash: string): Promise<WithdrawalRequestDocument> {
    const request = await this.withdrawalModel.findById(requestId).exec();
    if (!request) {
      throw new BadRequestException('Withdrawal request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const user = await this.userModel.findOne({ telegramId: request.telegramId }).exec();
    if (!user) {
      throw new BadRequestException('Associated user not found');
    }

    request.status = 'APPROVED';
    request.txHash = txHash;
    await request.save();

    user.referralPointsPending = Math.max(0, (user.referralPointsPending || 0) - request.points);
    user.referralPointsWithdrawn = (user.referralPointsWithdrawn || 0) + request.points;
    await user.save();

    return request;
  }

  async adminRejectWithdrawal(requestId: string): Promise<WithdrawalRequestDocument> {
    const request = await this.withdrawalModel.findById(requestId).exec();
    if (!request) {
      throw new BadRequestException('Withdrawal request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const user = await this.userModel.findOne({ telegramId: request.telegramId }).exec();
    if (!user) {
      throw new BadRequestException('Associated user not found');
    }

    request.status = 'REJECTED';
    await request.save();

    user.referralPointsPending = Math.max(0, (user.referralPointsPending || 0) - request.points);
    await user.save();

    return request;
  }

  // --- GIVEAWAY POOL ---

  async adminGetEligibleGiveawayUsers(): Promise<UserDocument[]> {
    return this.userModel
      .find({
        isSubscriber: true,
        weeklyTaps: { $gte: 10000 },
      })
      .sort({ weeklyTaps: -1 })
      .exec();
  }

  async adminDrawWeeklyGiveaway(): Promise<GiveawayDocument> {
    const eligible = await this.userModel
      .find({
        isSubscriber: true,
        weeklyTaps: { $gte: 10000 },
      })
      .exec();

    if (eligible.length === 0) {
      throw new BadRequestException('No eligible subscriber users with >= 10,000 weekly taps');
    }

    const winnerIndex = Math.floor(Math.random() * eligible.length);
    const winnerUser = eligible[winnerIndex];

    const winnerData = {
      telegramId: winnerUser.telegramId,
      username: winnerUser.username || '',
      firstName: winnerUser.firstName || '',
      lastName: winnerUser.lastName || '',
      walletAddress: winnerUser.svmWalletAddress || winnerUser.evmWalletAddress || 'N/A',
      amount: 1000,
    };

    const runnersUpUsers = eligible.filter((_, idx) => idx !== winnerIndex);
    const runnersUpData = [];

    if (runnersUpUsers.length > 0) {
      const splitAmount = 1000 / runnersUpUsers.length;
      for (const ru of runnersUpUsers) {
        runnersUpData.push({
          telegramId: ru.telegramId,
          username: ru.username || '',
          firstName: ru.firstName || '',
          lastName: ru.lastName || '',
          walletAddress: ru.svmWalletAddress || ru.evmWalletAddress || 'N/A',
          amount: splitAmount,
        });
      }
    }

    const giveaway = await this.giveawayModel.create({
      weekEndDate: new Date(),
      winner: winnerData,
      runnersUp: runnersUpData,
    });

    await this.userModel.updateMany({}, { weeklyTaps: 0 }).exec();

    return giveaway;
  }

  async adminGetGiveaways(): Promise<GiveawayDocument[]> {
    return this.giveawayModel
      .find()
      .sort({ weekEndDate: -1 })
      .exec();
  }
}
