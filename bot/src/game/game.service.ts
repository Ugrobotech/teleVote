import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
import { TapRecord, TapRecordDocument } from './schemas/tap-record.schema';
import { DailyTapRecord, DailyTapRecordDocument } from './schemas/daily-tap-record.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { ALL_SEED_CANDIDATES } from '../data/seed-candidates';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @InjectModel(TapRecord.name) private tapRecordModel: Model<TapRecordDocument>,
    @InjectModel(DailyTapRecord.name) private dailyTapRecordModel: Model<DailyTapRecordDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Get candidates with optional filtering by role and state.
   */
  async getCandidates(role?: string, state?: string) {
    const filter: any = {};
    if (role) filter.role = role;
    if (state) filter.state = state;
    return this.candidateModel.find(filter).exec();
  }

  async tapCandidate(userId: string, candidateId: string, taps: number) {
    if (taps <= 0 || taps > 100) {
      throw new BadRequestException('Invalid tap count or exceeds limit per request');
    }

    // Resolve user document to obtain database ObjectId
    const userDoc = await this.userModel.findOne({ telegramId: userId }).exec();
    if (!userDoc) {
      throw new BadRequestException('User not found');
    }
    const userObjectId = userDoc._id;

    // Resolve date string (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // Check today's daily taps for this candidate
    const dailyRecord = await this.dailyTapRecordModel.findOne({
      user: userObjectId,
      candidate: candidateId,
      dateStr: todayStr,
    } as any);

    const currentDailyTaps = dailyRecord ? dailyRecord.tapCount : 0;
    if (currentDailyTaps >= 100) {
      throw new BadRequestException('Daily tap limit of 100 reached for this candidate');
    }

    const allowedTaps = Math.min(taps, 100 - currentDailyTaps);
    if (allowedTaps <= 0) {
      throw new BadRequestException('Daily tap limit reached');
    }

    // Update DailyTapRecord
    await this.dailyTapRecordModel.updateOne(
      { user: userObjectId, candidate: candidateId, dateStr: todayStr } as any,
      { $inc: { tapCount: allowedTaps } },
      { upsert: true }
    );

    // Update Candidate totalTaps
    const candidate = await this.candidateModel.findByIdAndUpdate(
      candidateId,
      { $inc: { totalTaps: allowedTaps } },
      { returnDocument: 'after' }
    );

    // Update overall User score
    userDoc.score = (userDoc.score || 0) + allowedTaps;
    await userDoc.save();

    // Update lifetime TapRecord for candidate
    await this.tapRecordModel.updateOne(
      { user: userObjectId, candidate: candidateId } as any,
      { $inc: { tapCount: allowedTaps } },
      { upsert: true }
    );

    const record = await this.tapRecordModel.findOne({ user: userObjectId, candidate: candidateId } as any);

    return {
      success: true,
      allowedTaps,
      newTotalTaps: record?.tapCount || 0,
      dailyTapsCount: currentDailyTaps + allowedTaps,
      candidateTotalTaps: candidate?.totalTaps || 0,
    };
  }

  async getLeaderboard(candidateId?: string) {
    if (candidateId) {
      return this.tapRecordModel.find({ candidate: candidateId } as any)
        .sort({ tapCount: -1 })
        .limit(100)
        .populate('user', 'username firstName lastName telegramId score')
        .populate('candidate', 'name role')
        .exec();
    } else {
      // Global User Leaderboard
      const topUsers = await this.userModel.find({ onboardingComplete: true })
        .sort({ score: -1 })
        .limit(100)
        .select('username firstName lastName telegramId score state')
        .exec();
      // Map to a common format
      return topUsers.map((user, idx) => ({
        _id: user._id,
        user: {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          telegramId: user.telegramId,
          score: user.score,
        },
        tapCount: user.score,
        isGlobal: true,
      }));
    }
  }

  async createCandidate(data: any) {
    return this.candidateModel.create(data);
  }

  /**
   * Seed the database with initial candidate data.
   * Skips candidates that already exist (matched by name + role).
   */
  async seedCandidates() {
    let created = 0;
    let skipped = 0;

    for (const candidate of ALL_SEED_CANDIDATES) {
      const exists = await this.candidateModel.findOne({
        name: candidate.name,
        role: candidate.role,
      });

      if (!exists) {
        await this.candidateModel.create(candidate);
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped, total: ALL_SEED_CANDIDATES.length };
  }

  async getDailyTaps(userId: string, candidateId: string) {
    const userDoc = await this.userModel.findOne({ telegramId: userId }).exec();
    if (!userDoc) {
      return { dailyTaps: 0 };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const record = await this.dailyTapRecordModel.findOne({
      user: userDoc._id,
      candidate: candidateId,
      dateStr: todayStr,
    } as any);
    return { dailyTaps: record ? record.tapCount : 0 };
  }

  async getCandidatesWithStats() {
    const candidates = await this.candidateModel.find().exec();
    const stats = [];
    for (const c of candidates) {
      let userCount = 0;
      if (c.role === 'PRESIDENT') {
        userCount = await this.userModel.countDocuments({ presidentialCandidate: c._id.toString() } as any).exec();
      } else {
        userCount = await this.userModel.countDocuments({ gubernatorialCandidate: c._id.toString() } as any).exec();
      }
      stats.push({
        _id: c._id,
        name: c.name,
        role: c.role,
        state: c.state,
        party: c.party,
        imageUrl: c.imageUrl,
        totalTaps: c.totalTaps,
        userCount,
      });
    }
    return stats;
  }

  async updateCandidate(id: string, data: any) {
    const allowedFields = ['name', 'party', 'imageUrl', 'state'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }
    return this.candidateModel.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).exec();
  }

  async deleteCandidate(id: string) {
    return this.candidateModel.findByIdAndDelete(id).exec();
  }
}
