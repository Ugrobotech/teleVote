import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('api/game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('candidates')
  async getCandidates() {
    return this.gameService.getCandidates();
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
  async createCandidate(@Body() body: any) {
    return this.gameService.createCandidate(body);
  }
}
