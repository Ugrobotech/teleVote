import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TapRecordDocument = TapRecord & Document;

@Schema({ timestamps: true })
export class TapRecord {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Candidate' })
  candidate: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  tapCount: number;
}

export const TapRecordSchema = SchemaFactory.createForClass(TapRecord);
