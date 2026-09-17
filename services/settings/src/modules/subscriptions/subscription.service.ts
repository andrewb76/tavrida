import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity, type BillingPeriod } from '../../entities/user-subscription.entity';
import { BillingClient } from '../billing/billing-client.service';
import { ActivateSubscriptionDto } from './dto/subscriptions.dto';

const DEFAULT_PLAN_ID = 'free';

export type RenewRunResult = {
  scanned: number;
  renewed: number;
  expired: number;
  failed: number;
  results: Array<{
    userId: string;
    action: 'renewed' | 'expired' | 'failed';
    planId: string;
    detail?: string;
    transactionId?: string;
    expiresAt?: string | null;
  }>;
};

function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function activateIdempotencyKey(
  userId: string,
  planId: string,
  period: BillingPeriod,
  dayUtc: string,
): string {
  return `settings.activate:${userId}:${planId}:${period}:${dayUtc}`;
}

function renewIdempotencyKey(userId: string, expiresAt: Date): string {
  return `settings.renew:${userId}:${expiresAt.toISOString()}`;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
    @InjectRepository(PlanEntity)
    private readonly plans: Repository<PlanEntity>,
    private readonly billing: BillingClient,
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
    const plan = await this.plans.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException({ type: 'plan_not_found', detail: dto.planId });
    }

    const billingPeriod = dto.billingPeriod;
    const price =
      billingPeriod === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

    let billingCharged = false;
    let transactionId: string | undefined;

    if (price > 0) {
      const periodLabel = billingPeriod === 'yearly' ? 'год' : 'мес.';
      const charge = await this.billing.charge({
        userId: dto.userId,
        amount: price,
        target: `settings.activate:${dto.planId}`,
        description: `${plan.title} (${periodLabel})`,
        idempotencyKey: activateIdempotencyKey(
          dto.userId,
          dto.planId,
          billingPeriod,
          utcDayKey(),
        ),
      });
      billingCharged = true;
      transactionId = charge.transactionId;
    }

    const now = new Date();
    const expiresAt = price > 0 ? this.calculateExpiresAt(now, billingPeriod) : null;

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
      billingCharged,
      transactionId,
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
      failed: 0,
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

      try {
        const plan = await this.plans.findOne({ where: { id: row.planId } });
        if (!plan) {
          row.status = 'EXPIRED';
          await this.subscriptions.save(row);
          result.failed += 1;
          result.results.push({
            userId: row.userId,
            action: 'failed',
            planId: row.planId,
            detail: 'plan_not_found',
          });
          continue;
        }

        const price = period === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

        let transactionId: string | undefined;
        if (price > 0) {
          const periodLabel = period === 'yearly' ? 'год' : 'мес.';
          const charge = await this.billing.charge({
            userId: row.userId,
            amount: price,
            target: `settings.renew:${row.planId}`,
            description: `Продление ${plan.title} (${periodLabel})`,
            idempotencyKey: renewIdempotencyKey(row.userId, row.expiresAt ?? now),
          });
          transactionId = charge.transactionId;
        }

        const base = row.expiresAt && row.expiresAt.getTime() > now.getTime() ? row.expiresAt : now;
        const next = this.addBillingPeriod(base, period);
        row.expiresAt = next;
        row.status = 'ACTIVE';
        await this.subscriptions.save(row);

        result.renewed += 1;
        result.results.push({
          userId: row.userId,
          action: 'renewed',
          planId: row.planId,
          transactionId,
          expiresAt: next.toISOString(),
        });
      } catch (error) {
        row.status = 'EXPIRED';
        await this.subscriptions.save(row);
        result.failed += 1;
        this.logger.warn(
          `renew failed user=${row.userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        result.results.push({
          userId: row.userId,
          action: 'failed',
          planId: row.planId,
          detail: (error instanceof Error ? error.message : String(error)).slice(0, 200),
          expiresAt: row.expiresAt?.toISOString() ?? null,
        });
      }
    }

    if (result.scanned) {
      this.logger.log(
        `renewDue scanned=${result.scanned} renewed=${result.renewed} expired=${result.expired} failed=${result.failed}`,
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
