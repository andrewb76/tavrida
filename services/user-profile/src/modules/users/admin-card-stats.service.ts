import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InviteCodeEntity } from '../../entities/invite-code.entity';
import { UserProfileEntity } from '../../entities/user-profile.entity';
import { UserRatingEntity } from '../../entities/user-rating.entity';

export type AdminCardUserStats = {
  totalRating: number;
  karma: number;
  referralKarma: number;
  referralRating: number;
  effectiveKarma: number;
  effectiveRating: number;
  verifiedSales: number;
  pendingSales: number;
  feedbackCoverage: number | null;
  /** Rating ban — not implemented yet (docs-only rating service). */
  banUntil: string | null;
  isLimited: boolean;
  invitesIssued: number;
  invitesThisMonth: number;
  referralL1: number;
  referralL2: number;
};

const EMPTY_RATING = {
  totalRating: 0,
  karma: 0,
  referralKarma: 0,
  referralRating: 0,
  effectiveKarma: 0,
  effectiveRating: 0,
  verifiedSales: 0,
  pendingSales: 0,
  feedbackCoverage: null as number | null,
};

@Injectable()
export class AdminCardStatsService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profiles: Repository<UserProfileEntity>,
    @InjectRepository(UserRatingEntity)
    private readonly ratings: Repository<UserRatingEntity>,
    @InjectRepository(InviteCodeEntity)
    private readonly inviteCodes: Repository<InviteCodeEntity>,
  ) {}

  async getStatsForUsers(userIds: string[]): Promise<Record<string, AdminCardUserStats>> {
    const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    const out: Record<string, AdminCardUserStats> = {};
    for (const id of unique) {
      out[id] = {
        ...EMPTY_RATING,
        banUntil: null,
        isLimited: false,
        invitesIssued: 0,
        invitesThisMonth: 0,
        referralL1: 0,
        referralL2: 0,
      };
    }
    if (!unique.length) return out;

    const [ratingRows, inviteRows, l1Rows, l2Rows] = await Promise.all([
      this.ratings.find({ where: { userId: In(unique) } }),
      this.inviteCodes
        .createQueryBuilder('invite')
        .select('invite.issuerId', 'issuerId')
        .addSelect('COUNT(*)', 'issued')
        .addSelect(
          `COUNT(*) FILTER (WHERE invite.createdAt >= date_trunc('month', timezone('UTC', NOW())))`,
          'thisMonth',
        )
        .where('invite.issuerId IN (:...ids)', { ids: unique })
        .groupBy('invite.issuerId')
        .getRawMany<{ issuerId: string; issued: string; thisMonth: string }>(),
      this.profiles
        .createQueryBuilder('profile')
        .select('profile.inviterId', 'inviterId')
        .addSelect('COUNT(*)', 'cnt')
        .where('profile.inviterId IN (:...ids)', { ids: unique })
        .andWhere('profile.deletedAt IS NULL')
        .groupBy('profile.inviterId')
        .getRawMany<{ inviterId: string; cnt: string }>(),
      this.profiles
        .createQueryBuilder('l2')
        .innerJoin(
          UserProfileEntity,
          'l1',
          'l1.userId = l2.inviterId AND l1.deletedAt IS NULL',
        )
        .select('l1.inviterId', 'rootId')
        .addSelect('COUNT(*)', 'cnt')
        .where('l1.inviterId IN (:...ids)', { ids: unique })
        .andWhere('l2.deletedAt IS NULL')
        .groupBy('l1.inviterId')
        .getRawMany<{ rootId: string; cnt: string }>(),
    ]);

    for (const row of ratingRows) {
      const stats = this.toRating(row);
      const bucket = out[row.userId];
      if (!bucket) continue;
      Object.assign(bucket, stats);
    }

    for (const row of inviteRows) {
      const bucket = out[row.issuerId];
      if (!bucket) continue;
      bucket.invitesIssued = Number(row.issued) || 0;
      bucket.invitesThisMonth = Number(row.thisMonth) || 0;
    }

    for (const row of l1Rows) {
      const bucket = out[row.inviterId];
      if (!bucket) continue;
      bucket.referralL1 = Number(row.cnt) || 0;
    }

    for (const row of l2Rows) {
      const bucket = out[row.rootId];
      if (!bucket) continue;
      bucket.referralL2 = Number(row.cnt) || 0;
    }

    return out;
  }

  private toRating(row: UserRatingEntity) {
    const totalRating = Number(row.totalRating);
    const karma = Number(row.karma);
    const referralKarma = Number(row.referralKarma);
    const referralRating = Number(row.referralRating);
    const verifiedSales = row.verifiedSales;
    const pendingSales = row.pendingSales;
    const salesTotal = verifiedSales + pendingSales;

    return {
      totalRating,
      karma,
      referralKarma,
      referralRating,
      effectiveKarma: karma + referralKarma,
      effectiveRating: Math.max(0, Math.min(5, totalRating + referralRating)),
      verifiedSales,
      pendingSales,
      feedbackCoverage: salesTotal > 0 ? verifiedSales / salesTotal : null,
    };
  }
}
