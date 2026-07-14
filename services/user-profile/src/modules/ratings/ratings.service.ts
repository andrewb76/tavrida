import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  ReputationChangeLogEntity,
  type ReputationChangeSource,
  type ReputationMetric,
} from '../../entities/reputation-change-log.entity';
import { UserRatingEntity } from '../../entities/user-rating.entity';

export type UserRatingStats = {
  userId: string;
  totalRating: number;
  karma: number;
  referralKarma: number;
  referralRating: number;
  effectiveKarma: number;
  effectiveRating: number;
  verifiedSales: number;
  pendingSales: number;
  feedbackCoverage: number | null;
};

export type ReputationLogEntry = {
  id: string;
  userId: string;
  metric: ReputationMetric;
  delta: number;
  balanceAfter: number;
  source: ReputationChangeSource;
  actorId: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
};

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(UserRatingEntity)
    private readonly ratings: Repository<UserRatingEntity>,
    @InjectRepository(ReputationChangeLogEntity)
    private readonly logs: Repository<ReputationChangeLogEntity>,
  ) {}

  async getStats(userId: string): Promise<UserRatingStats> {
    const row = await this.ensure(userId);
    return this.toStats(row);
  }

  async listLog(
    userId: string,
    input: { metric: ReputationMetric; limit?: number },
  ): Promise<{ data: ReputationLogEntry[] }> {
    const take = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const rows = await this.logs.find({
      where: { userId, metric: input.metric },
      order: { createdAt: 'DESC' },
      take,
    });
    return { data: rows.map((row) => this.toLogEntry(row)) };
  }

  async adjust(
    userId: string,
    input: {
      karmaDelta?: number;
      ratingDelta?: number;
      actorId?: string;
      source?: ReputationChangeSource;
      note?: string;
    },
  ) {
    const row = await this.ensure(userId);
    const source = input.source ?? 'ADMIN_ADJUST';
    const karmaDelta = input.karmaDelta ?? 0;
    const ratingDelta = input.ratingDelta ?? 0;

    if (karmaDelta !== 0) {
      const karma = Number(row.karma) + karmaDelta;
      row.karma = karma.toFixed(2);
      await this.appendLog({
        userId,
        metric: 'karma',
        delta: karmaDelta,
        balanceAfter: karma,
        source,
        actorId: input.actorId ?? null,
        note: input.note ?? null,
      });
    }

    if (ratingDelta !== 0) {
      const totalRating = this.clampRating(Number(row.totalRating) + ratingDelta);
      row.totalRating = totalRating.toFixed(2);
      await this.appendLog({
        userId,
        metric: 'rating',
        delta: ratingDelta,
        balanceAfter: totalRating,
        source,
        actorId: input.actorId ?? null,
        note: input.note ?? null,
      });
    }

    if (karmaDelta !== 0 || ratingDelta !== 0) {
      await this.ratings.save(row);
    }

    return this.toStats(row);
  }

  private async appendLog(input: {
    userId: string;
    metric: ReputationMetric;
    delta: number;
    balanceAfter: number;
    source: ReputationChangeSource;
    actorId: string | null;
    note: string | null;
  }) {
    await this.logs.save(
      this.logs.create({
        id: randomUUID(),
        userId: input.userId,
        metric: input.metric,
        delta: input.delta.toFixed(2),
        balanceAfter: input.balanceAfter.toFixed(2),
        source: input.source,
        actorId: input.actorId,
        referenceId: null,
        note: input.note,
      }),
    );
  }

  private async ensure(userId: string) {
    let row = await this.ratings.findOne({ where: { userId } });
    if (row) return row;

    row = this.ratings.create({
      userId,
      totalRating: '0.00',
      karma: '0.00',
      referralKarma: '0.00',
      referralRating: '0.00',
      verifiedSales: 0,
      pendingSales: 0,
    });
    return this.ratings.save(row);
  }

  private toStats(row: UserRatingEntity): UserRatingStats {
    const totalRating = Number(row.totalRating);
    const karma = Number(row.karma);
    const referralKarma = Number(row.referralKarma);
    const referralRating = Number(row.referralRating);
    const verifiedSales = row.verifiedSales;
    const pendingSales = row.pendingSales;
    const salesTotal = verifiedSales + pendingSales;

    return {
      userId: row.userId,
      totalRating,
      karma,
      referralKarma,
      referralRating,
      effectiveKarma: karma + referralKarma,
      effectiveRating: this.clampRating(totalRating + referralRating),
      verifiedSales,
      pendingSales,
      feedbackCoverage: salesTotal > 0 ? verifiedSales / salesTotal : null,
    };
  }

  private toLogEntry(row: ReputationChangeLogEntity): ReputationLogEntry {
    return {
      id: row.id,
      userId: row.userId,
      metric: row.metric,
      delta: Number(row.delta),
      balanceAfter: Number(row.balanceAfter),
      source: row.source,
      actorId: row.actorId,
      referenceId: row.referenceId,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private clampRating(value: number) {
    return Math.max(0, Math.min(5, value));
  }
}
