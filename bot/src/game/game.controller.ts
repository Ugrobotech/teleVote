import { Controller, Get, Post, Put, Delete, Body, Query, Headers, UnauthorizedException, Param } from '@nestjs/common';
import { GameService } from './game.service';
import { ConfigService } from '@nestjs/config';

@Controller('api/game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/game/candidates?role=PRESIDENT&state=Lagos
   * Returns candidates filtered by optional role and state.
   */
  @Get('candidates')
  async getCandidates(
    @Query('role') role?: string,
    @Query('state') state?: string,
  ) {
    return this.gameService.getCandidates(role, state);
  }

  @Post('tap')
  async tap(@Body() body: { userId: string, candidateId: string, taps: number }) {
    return this.gameService.tapCandidate(body.userId, body.candidateId, body.taps);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('candidateId') candidateId?: string) {
    return this.gameService.getLeaderboard(candidateId);
  }

  @Post('candidate')
  async createCandidate(
    @Body() body: any,
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return this.gameService.createCandidate(body);
  }

  @Get('daily-taps')
  async getDailyTaps(
    @Query('userId') userId: string,
    @Query('candidateId') candidateId: string,
  ) {
    return this.gameService.getDailyTaps(userId, candidateId);
  }

  /**
   * POST /api/game/seed
   * Seeds the database with initial candidate data.
   */
  @Post('seed')
  async seedCandidates() {
    return this.gameService.seedCandidates();
  }

  @Get('admin/candidates')
  async adminGetCandidates(
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return this.gameService.getCandidatesWithStats();
  }

  @Put('candidate/:id')
  async updateCandidate(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return this.gameService.updateCandidate(id, body);
  }

  @Delete('candidate/:id')
  async deleteCandidate(
    @Param('id') id: string,
    @Headers('x-admin-username') username?: string,
    @Headers('x-admin-password') password?: string,
  ) {
    const expectedUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const expectedPassword = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');

    if (!username || !password || username !== expectedUsername || password !== expectedPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return this.gameService.deleteCandidate(id);
  }
}
