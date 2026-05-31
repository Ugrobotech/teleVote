import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CandidateDocument = Candidate & Document;

export enum CandidateRole {
  PRESIDENT = 'PRESIDENT',
  GOVERNOR = 'GOVERNOR',
}

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: CandidateRole })
  role: CandidateRole;

  @Prop()
  state: string; // Only required if role === 'GOVERNOR'

  @Prop()
  imageUrl: string;

  @Prop()
  party: string;

  @Prop({ default: 0 })
  totalTaps: number;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
