import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GiveawayDocument = Giveaway & Document;

@Schema({ timestamps: true })
export class Giveaway {
  @Prop({ required: true, default: Date.now })
  weekEndDate: Date;

  @Prop({ type: Object, required: true })
  winner: {
    telegramId: string;
    username: string;
    firstName: string;
    lastName: string;
    walletAddress: string;
    amount: number; // e.g. 1000
  };

  @Prop({ type: [{ type: Object }], default: [] })
  runnersUp: {
    telegramId: string;
    username: string;
    firstName: string;
    lastName: string;
    walletAddress: string;
    amount: number; // e.g. 1000 / N
  }[];
}

export const GiveawaySchema = SchemaFactory.createForClass(Giveaway);
