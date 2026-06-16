import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ required: true })
  telegramId: string;

  @Prop()
  username: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ required: true, default: 0 })
  points: number;

  @Prop({ required: true })
  walletAddress: string;

  @Prop({ required: true, enum: ['solana', 'evm'] })
  chain: 'solana' | 'evm';

  @Prop({ default: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status: string;

  @Prop()
  txHash: string;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
