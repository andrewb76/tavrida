import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity, type BillingPeriod } from '../../entities/user-subscription.entity';
import { ActivateSubscriptionDto } from './dto/subscriptions.dto';

const DEFAULT_PLAN_ID = 'free';

export type RenewRunResult = {
  scanned: number;
  renewed: number;
  expired: number;
  results: Array<{
    userId: string;
    action: 'renewed' | 'expired';
    planId: string;
    expiresAt: string | null;
  }>;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
  ) {}

  async getByUser(userId: string) {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub) {
      return {
        userId,
        planId: DEFAULT_PLAN_ID,
        status: 'ACTIVE' as const,
        autoRenew: false,
        billingPeriod: null as BillingPeriod | null,
        startsAt: null,
        expiresAt: null,
      };
    }

    return {
      userId: sub.userId,
      planId: sub.planId,
      status: sub.status,
      autoRenew: sub.autoRenew,
      billingPeriod: sub.billingPeriod,
      startsAt: sub.startsAt.toISOString(),
      expiresAt: sub.expiresAt?.toISOString() ?? null,
    };
  }

  async activate(dto: ActivateSubscriptionDto) {
    const billingPeriod = dto.billingPeriod;
    const now = new Date();
    const expiresAt = this.calculateExpiresAt(now, billingPeriod);

    const existing = await this.subscriptions.findOne({ where: { userId: dto.userId } });

    const record =
      existing ??
      this.subscriptions.create({
        userId: dto.userId,
        planId: dto.planId,
        startsAt: now,
        expiresAt,
        autoRenew: dto.autoRenew ?? false,
        billingPeriod,
        status: 'ACTIVE',
      });

    record.planId = dto.planId;
    record.startsAt = now;
    record.expiresAt = expiresAt;
    record.autoRenew = dto.autoRenew ?? false;
    record.billingPeriod = billingPeriod;
    record.status = 'ACTIVE';

    await this.subscriptions.save(record);

    return {
      userId: record.userId,
      planId: record.planId,
      status: record.status,
      autoRenew: record.autoRenew,
      billingPeriod: record.billingPeriod,
      startsAt: record.startsAt.toISOString(),
      expiresAt: record.expiresAt?.toISOString() ?? null,
    };
  }

  async cancelAutoRenew(userId: string) {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub) {
      return { userId, autoRenew: false, updated: false };
    }
    sub.autoRenew = false;
    await this.subscriptions.save(sub);
    return { userId, autoRenew: false, updated: true };
  }

  async resolvePlanId(userId: string): Promise<string> {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (sub?.status !== 'ACTIVE') return DEFAULT_PLAN_ID;
    if (sub.expiresAt && sub.expiresAt.getTime() <= Date.now()) return DEFAULT_PLAN_ID;
    return sub.planId;
  }

  async renewDue(): Promise<RenewRunResult> {
    const now = new Date();
    const candidates = await this.subscriptions.find({
      where: {
        status: 'ACTIVE',
        expiresAt: LessThanOrEqual(now),
      },
      take: 200,
      order: { expiresAt: 'ASC' },
    });

    const result: RenewRunResult = {
      scanned: candidates.length,
      renewed: 0,
      expired: 0,
      results: [],
    };

    for (const row of candidates) {
      if (!row.autoRenew) {
        row.status = 'EXPIRED';
        await this.subscriptions.save(row);
        result.expired += 1;
        result.results.push({
          userId: row.userId,
          action: 'expired',
          planId: row.planId,
          expiresAt: row.expiresAt?.toISOString() ?? null,
        });
        continue;
      }

      const period = row.billingPeriod ?? 'monthly';
      const next = this.addBillingPeriod(now, period);
      row.expiresAt = next;
      row.status = 'ACTIVE';
      await this.subscriptions.save(row);

      result.renewed += 1;
      result.results.push({
        userId: row.userId,
        action: 'renewed',
        planId: row.planId,
        expiresAt: next.toISOString(),
      });
    }

    if (result.scanned) {
      this.logger.log(
        `renewDue scanned=${result.scanned} renewed=${result.renewed} expired=${result.expired}`,
      );
    }

    return result;
  }

  private calculateExpiresAt(from: Date, billingPeriod: BillingPeriod): Date {
    return this.addBillingPeriod(from, billingPeriod);
  }

  private addBillingPeriod(from: Date, billingPeriod: BillingPeriod): Date {
    const d = new Date(from);
    if (billingPeriod === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  }
}
