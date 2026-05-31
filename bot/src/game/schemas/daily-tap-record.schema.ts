import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DailyTapRecordDocument = DailyTapRecord & Document;

@Schema({ timestamps: true })
export class DailyTapRecord {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Candidate' })
  candidate: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  dateStr: string; // YYYY-MM-DD format

  @Prop({ required: true, default: 0 })
  tapCount: number;
}

export const DailyTapRecordSchema = SchemaFactory.createForClass(DailyTapRecord);

// Add unique index on user + candidate + dateStr to prevent double records
DailyTapRecordSchema.index({ user: 1, candidate: 1, dateStr: 1 }, { unique: true });
