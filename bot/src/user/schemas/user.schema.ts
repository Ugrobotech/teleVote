import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: string;

  @Prop()
  username: string;

  @Prop({ default: 0 })
  score: number;

  @Prop()
  state: string;

  @Prop()
  presidentialCandidate: string;

  @Prop()
  gubernatorialCandidate: string;

  @Prop({ unique: true })
  referralCode: string;

  @Prop()
  referredBy: string;

  @Prop({ default: false })
  isSubscriber: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
