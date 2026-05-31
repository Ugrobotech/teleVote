import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import {
  Candidate,
  CandidateDocument,
} from '../game/schemas/candidate.schema';
import { NIGERIAN_STATES } from '../data/nigerian-states.data';

const botLink= process.env.BOT_LINK;

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
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
        const referrer = await this.userModel.findOne({ referralCode: referredByCode }).exec();
        if (referrer && referrer.telegramId !== telegramId) {
          referrerId = referrer.telegramId;
        }
      }

      user = await this.userModel.create({
        telegramId,
        username: username || '',
        firstName: firstName || '',
        lastName: lastName || '',
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
      gubernatorialCandidateId: string;
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

    // Update user record
    const user = await this.userModel
      .findOneAndUpdate(
        { telegramId },
        {
          state: data.state,
          presidentialCandidate: data.presidentialCandidateId,
          gubernatorialCandidate: data.gubernatorialCandidateId,
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
      await this.userModel.findOneAndUpdate(
        { telegramId: user.referredBy },
        { $inc: { score: 500 } }
      ).exec();
    }

    return user;
  }

  async getUserProfile(telegramId: string) {
    const user = await this.userModel.findOne({ telegramId }).exec();
    if (!user) return null;

    let presidentialCandidate = null;
    let gubernatorialCandidate = null;

    if (user.presidentialCandidate) {
      presidentialCandidate = await this.candidateModel.findById(user.presidentialCandidate).exec();
    }
    if (user.gubernatorialCandidate) {
      gubernatorialCandidate = await this.candidateModel.findById(user.gubernatorialCandidate).exec();
    }

    // Get referral stats
    const totalReferred = await this.userModel.countDocuments({ referredBy: telegramId }).exec();
    const subscribedReferred = await this.userModel.countDocuments({ referredBy: telegramId, isSubscriber: true }).exec();

    // Fetch friend details
    const friends = await this.userModel.find(
      { referredBy: telegramId },
      'username firstName lastName isSubscriber onboardingComplete score'
    ).exec();

    return {
      user,
      presidentialCandidate,
      gubernatorialCandidate,
      botLink: process.env.BOT_LINK,
      referralStats: {
        totalReferred,
        subscribedReferred,
        friends,
      }
    };
  }

  async subscribeUser(telegramId: string): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { isSubscriber: true },
      { returnDocument: 'after' }
    ).exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async generateShareCard(telegramId: string): Promise<Buffer> {
    const profile = await this.getUserProfile(telegramId);
    if (!profile) {
      throw new BadRequestException('User profile not found');
    }

    const { user, presidentialCandidate, gubernatorialCandidate } = profile;

    // Load canvas dynamically to avoid errors in environments where it might not compile
    let createCanvas;
    try {
      const canvasPkg = require('canvas');
      createCanvas = canvasPkg.createCanvas;
    } catch (err) {
      throw new BadRequestException('Canvas graphics generation is not supported on this host: ' + err.message);
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

    // Overlay dark transparent card in center for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    // Fallback if roundRect is not supported in this canvas version
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 40, 700, 370, 20);
    } else {
      ctx.rect(50, 40, 700, 370);
    }
    ctx.fill();

    // 2. Branded Header
    ctx.fillStyle = '#FFD700'; // Gold accent
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAP FOR YOUR CANDIDATE 2027 🇳🇬', 400, 90);

    // 3. User info
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    const displayName = user.firstName ? `${user.firstName} ${user.lastName}`.trim() : `@${user.username || 'User'}`;
    ctx.fillText(`Voter: ${displayName}`, 400, 140);

    // Draw thin gold divider line
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, 160);
    ctx.lineTo(650, 160);
    ctx.stroke();

    // 4. Candidate Supports
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('MY PREFERRED REPRESENTATIVES:', 400, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const presName = presidentialCandidate ? presidentialCandidate.name : 'Not Selected';
    ctx.fillText(`President: ${presName}`, 400, 245);

    const govName = gubernatorialCandidate ? `${gubernatorialCandidate.name} (${user.state})` : 'Not Selected';
    ctx.fillText(`Governor: ${govName}`, 400, 290);

    // Draw thin gold divider line
    ctx.beginPath();
    ctx.moveTo(250, 320);
    ctx.lineTo(550, 320);
    ctx.stroke();

    // 5. User score & Invite
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`Total Tap Contribution: ${user.score.toLocaleString()} PTS`, 400, 360);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Join my movement: ${botLink}?start=${user.referralCode || 'ref_' + telegramId}`, 400, 395);

    return canvas.toBuffer('image/png');
  }

  async adminSearchUserByUsername(username: string): Promise<any> {
    const user = await this.userModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).exec();
    if (!user) return null;

    let presidentialCandidate = null;
    let gubernatorialCandidate = null;

    if (user.presidentialCandidate) {
      presidentialCandidate = await this.candidateModel.findById(user.presidentialCandidate).exec();
    }
    if (user.gubernatorialCandidate) {
      gubernatorialCandidate = await this.candidateModel.findById(user.gubernatorialCandidate).exec();
    }

    const friends = await this.userModel.find(
      { referredBy: user.telegramId },
      'username firstName lastName isSubscriber onboardingComplete score'
    ).exec();

    return {
      user,
      presidentialCandidate,
      gubernatorialCandidate,
      friends,
    };
  }

  async adminGetSubscribers(): Promise<UserDocument[]> {
    return this.userModel.find({ isSubscriber: true }).sort({ updatedAt: -1 }).exec();
  }
}
