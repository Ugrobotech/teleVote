import { Controller, Get, Post, Body, Query, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { NIGERIAN_STATES } from '../data/nigerian-states.data';

@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/user/states
   * Returns the list of all 36 Nigerian states + FCT.
   */
  @Get('states')
  getStates() {
    return { states: NIGERIAN_STATES };
  }

  /**
   * GET /api/user/profile?telegramId=xxx
   * Returns the user profile including onboarding status and candidate info.
   */
  @Get('profile')
  async getProfile(@Query('telegramId') telegramId: string) {
    if (!telegramId) {
      return { error: 'telegramId is required' };
    }

    const profile = await this.userService.getUserProfile(telegramId);
    if (!profile) {
      return { exists: false, onboardingComplete: false };
    }

    return {
      exists: true,
      onboardingComplete: profile.user.onboardingComplete,
      user: {
        telegramId: profile.user.telegramId,
        username: profile.user.username,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        state: profile.user.state,
        presidentialCandidate: profile.presidentialCandidate,
        gubernatorialCandidate: profile.gubernatorialCandidate,
        score: profile.user.score,
        referralCode: profile.user.referralCode,
        referredBy: profile.user.referredBy,
        isSubscriber: profile.user.isSubscriber,
        weeklyTaps: profile.user.weeklyTaps || 0,
        referralPointsWithdrawn: profile.user.referralPointsWithdrawn || 0,
        referralPointsPending: profile.user.referralPointsPending || 0,
      },
      referralStats: profile.referralStats,
      botLink: profile.botLink,
    };
  }

  /**
   * POST /api/user/register
   * Creates a new user if one doesn't already exist. Support referral deep links.
   */
  @Post('register')
  async register(
    @Body()
    body: {
      telegramId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      referredByCode?: string;
    },
  ) {
    if (!body.telegramId) {
      return { error: 'telegramId is required' };
    }

    const user = await this.userService.findOrCreateByTelegramId(
      body.telegramId,
      body.username,
      body.firstName,
      body.lastName,
      body.referredByCode,
    );

    return {
      success: true,
      onboardingComplete: user.onboardingComplete,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        referralCode: user.referralCode,
      },
    };
  }

  /**
   * POST /api/user/subscribe
   * Subscribes the user by executing Web3 transfer to admin wallets.
   */
  @Post('subscribe')
  async subscribe(
    @Body()
    body: {
      telegramId: string;
      network?: string;
      tokenType?: string;
    },
  ) {
    if (!body.telegramId) {
      return { error: 'telegramId is required' };
    }

    const network = body.network || 'solana';
    const tokenType = body.tokenType || 'usdc';

    const result = await this.userService.subscribeUser(body.telegramId, network, tokenType);

    return {
      success: true,
      isSubscriber: result.user.isSubscriber,
      signature: result.signature,
    };
  }

  /**
   * POST /api/user/onboarding
   * Completes the onboarding process for a user.
   */
  @Post('onboarding')
  async completeOnboarding(
    @Body()
    body: {
      telegramId: string;
      state: string;
      presidentialCandidateId: string;
      gubernatorialCandidateId?: string;
    },
  ) {
    const user = await this.userService.completeOnboarding(body.telegramId, {
      state: body.state,
      presidentialCandidateId: body.presidentialCandidateId,
      gubernatorialCandidateId: body.gubernatorialCandidateId,
    });

    return {
      success: true,
      onboardingComplete: user.onboardingComplete,
    };
  }

  /**
   * GET /api/user/share-image?telegramId=xxx
   * Returns a dynamically generated image showing the voter card.
   */
  @Get('share-image')
  async getShareImage(@Query('telegramId') telegramId: string, @Res() res: Response) {
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    try {
      const buffer = await this.userService.generateShareCard(telegramId);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline; filename="share-card.png"');
      return res.send(buffer);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  @Get('admin/search')
  async adminSearch(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
    @Query('username') searchUsername?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (!searchUsername) {
      return { error: 'Username query parameter is required' };
    }

    const result = await this.userService.adminSearchUserByUsername(searchUsername.trim());
    if (!result) {
      return { found: false };
    }

    return { found: true, ...result };
  }

  @Get('admin/subscribers')
  async adminGetSubscribers(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const subscribers = await this.userService.adminGetSubscribers();
    return { subscribers };
  }

  // --- USER WITHDRAWALS ---

  @Post('withdraw')
  async withdraw(
    @Body()
    body: {
      telegramId: string;
      points: number;
      walletAddress: string;
      chain: 'solana' | 'evm';
    },
  ) {
    if (!body.telegramId || !body.points || !body.walletAddress || !body.chain) {
      return { error: 'telegramId, points, walletAddress, and chain are required' };
    }

    const request = await this.userService.submitWithdrawalRequest(
      body.telegramId,
      body.points,
      body.walletAddress,
      body.chain,
    );

    return { success: true, request };
  }

  @Get('withdrawals')
  async getWithdrawals(@Query('telegramId') telegramId: string) {
    if (!telegramId) {
      return { error: 'telegramId is required' };
    }

    const withdrawals = await this.userService.getUserWithdrawals(telegramId);
    return { withdrawals };
  }

  // --- ADMIN SYSTEM ---

  @Get('admin/withdrawals')
  async adminGetWithdrawals(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const withdrawals = await this.userService.adminGetWithdrawalRequests();
    return { withdrawals };
  }

  @Post('admin/withdrawals/approve')
  async adminApproveWithdrawal(
    @Body() body: { requestId: string; txHash: string },
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (!body.requestId || !body.txHash) {
      return { error: 'requestId and txHash are required' };
    }

    const request = await this.userService.adminApproveWithdrawal(body.requestId, body.txHash);
    return { success: true, request };
  }

  @Post('admin/withdrawals/reject')
  async adminRejectWithdrawal(
    @Body() body: { requestId: string },
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (!body.requestId) {
      return { error: 'requestId is required' };
    }

    const request = await this.userService.adminRejectWithdrawal(body.requestId);
    return { success: true, request };
  }

  @Get('admin/giveaway/eligible')
  async adminGetEligibleGiveaway(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const eligible = await this.userService.adminGetEligibleGiveawayUsers();
    return { eligible };
  }

  @Post('admin/giveaway/draw')
  async adminDrawGiveaway(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const draw = await this.userService.adminDrawWeeklyGiveaway();
    return { success: true, draw };
  }

  @Get('admin/giveaways')
  async adminGetGiveaways(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const giveaways = await this.userService.adminGetGiveaways();
    return { giveaways };
  }
}
