import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(UserRatingEntity)
    private readonly ratings: Repository<UserRatingEntity>,
  ) {}

  async getStats(userId: string): Promise<UserRatingStats> {
    const row = await this.ensure(userId);
    return this.toStats(row);
  }

  async adjust(userId: string, input: { karmaDelta?: number; ratingDelta?: number }) {
    const row = await this.ensure(userId);
    const karma = Number(row.karma) + (input.karmaDelta ?? 0);
    const totalRating = this.clampRating(Number(row.totalRating) + (input.ratingDelta ?? 0));

    row.karma = karma.toFixed(2);
    row.totalRating = totalRating.toFixed(2);
    await this.ratings.save(row);
    return this.toStats(row);
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

  private clampRating(value: number) {
    return Math.max(0, Math.min(5, value));
  }
}
