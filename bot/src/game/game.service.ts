import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
import { TapRecord, TapRecordDocument } from './schemas/tap-record.schema';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @InjectModel(TapRecord.name) private tapRecordModel: Model<TapRecordDocument>,
  ) {}

  async getCandidates() {
    return this.candidateModel.find().exec();
  }

  async tapCandidate(userId: string, candidateId: string, taps: number) {
    if (taps <= 0 || taps > 100) {
      throw new BadRequestException('Invalid tap count or exceeds limit per request');
    }

    // Update candidate's total taps in the database
    await this.candidateModel.findByIdAndUpdate(candidateId, { $inc: { totalTaps: taps } });

    // Insert or update tap record for the user and candidate
    await this.tapRecordModel.updateOne(
      { user: userId, candidate: candidateId } as any,
      { $inc: { tapCount: taps } },
      { upsert: true }
    );
    const record = await this.tapRecordModel.findOne({ user: userId, candidate: candidateId } as any);

    return { success: true, newTotalTaps: record?.tapCount || 0 };
  }
  async getLeaderboard(candidateId?: string) {
    const filter = candidateId ? { candidate: candidateId } : {};
    return this.tapRecordModel.find(filter as any)
      .sort({ tapCount: -1 })
      .limit(100)
      .populate('user', 'username telegramId score')
      .populate('candidate', 'name role')
      .exec();
  }

  async createCandidate(data: any) {
    return this.candidateModel.create(data);
  }
}
