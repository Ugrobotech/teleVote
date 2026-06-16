import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { Candidate, CandidateSchema } from '../game/schemas/candidate.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './schemas/withdrawal.schema';
import { Giveaway, GiveawaySchema } from '../game/schemas/giveaway.schema';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: Giveaway.name, schema: GiveawaySchema },
    ]),
    WalletModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
