import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop()
  username: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  evmWalletAddress: string;

  @Prop()
  svmWalletAddress: string;

  @Prop()
  evmWalletDetails: string;

  @Prop()
  svmWalletDetails: string;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  weeklyTaps: number;

  @Prop({ default: 0 })
  referralPointsWithdrawn: number;

  @Prop({ default: 0 })
  referralPointsPending: number;

  @Prop()
  state: string;

  @Prop()
  presidentialCandidate: string;

  @Prop()
  gubernatorialCandidate: string;

  @Prop({ unique: true, sparse: true })
  referralCode: string;

  @Prop()
  referredBy: string;

  @Prop({ default: false })
  isSubscriber: boolean;

  @Prop({ default: false })
  onboardingComplete: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
