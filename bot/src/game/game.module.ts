import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { Candidate, CandidateSchema } from './schemas/candidate.schema';
import { TapRecord, TapRecordSchema } from './schemas/tap-record.schema';
import { DailyTapRecord, DailyTapRecordSchema } from './schemas/daily-tap-record.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: TapRecord.name, schema: TapRecordSchema },
      { name: DailyTapRecord.name, schema: DailyTapRecordSchema },
      { name: User.name, schema: UserSchema }
    ])
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService]
})
export class GameModule {}
