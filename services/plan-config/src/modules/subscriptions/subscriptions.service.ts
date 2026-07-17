import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { BillingClient } from '../billing/billing.client';
import { PlansService } from '../plans/plans.service';
import {
  activateIdempotencyKey,
  addBillingPeriod,
  isExpireDue,
  isRenewDue,
  nextExpiresAt,
  renewIdempotencyKey,
  resolveBillingPeriod,
  utcDayKey,
  type BillingPeriod,
} from './subscription-renew.logic';

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

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
    private readonly plans: PlansService,
    private readonly billing: BillingClient,
  ) {}

  async resolvePlanId(userId: string): Promise<string> {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub || sub.status !== 'ACTIVE') return DEFAULT_PLAN_ID;
    if (sub.expiresAt && sub.expiresAt.getTime() <= Date.now()) return DEFAULT_PLAN_ID;
    return sub.planId;
  }

  async getSubscription(userId: string) {
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

  async activate(input: {
    userId: string;
    planId: string;
    autoRenew?: boolean;
    billingPeriod?: BillingPeriod;
  }) {
    const plan = await this.plans.findById(input.planId);
    if (!plan) {
      throw new NotFoundException({ type: 'plan_not_found', detail: input.planId });
    }

    const billingPeriod = input.billingPeriod ?? 'monthly';
    const price =
      billingPeriod === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

    let billingCharged = false;
    let transactionId: string | undefined;

    if (price > 0) {
      const periodLabel = billingPeriod === 'yearly' ? 'год' : 'мес.';
      const charge = await this.billing.charge({
        userId: input.userId,
        amount: price,
        target: `plan-config.activate-plan:${input.planId}`,
        description: `${plan.title} (${periodLabel})`,
        idempotencyKey: activateIdempotencyKey(
          input.userId,
          input.planId,
          billingPeriod,
          utcDayKey(),
        ),
      });
      billingCharged = true;
      transactionId = charge.transactionId;
    }

    const now = new Date();
    const expiresAt = price > 0 ? addBillingPeriod(now, billingPeriod) : null;
    const existing = await this.subscriptions.findOne({ where: { userId: input.userId } });

    const record =
      existing ??
      this.subscriptions.create({
        userId: input.userId,
        planId: input.planId,
        startsAt: now,
        expiresAt: null,
        autoRenew: input.autoRenew ?? false,
        billingPeriod,
        status: 'ACTIVE',
      });

    record.planId = input.planId;
    record.startsAt = now;
    record.expiresAt = expiresAt;
    record.autoRenew = input.autoRenew ?? false;
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

  /**
   * External CRON / ops calls this.
   * Due auto-renew → billing charge → extend expiresAt.
   * Charge fail → status EXPIRED (user falls back to free via resolvePlanId).
   * Due without autoRenew → status EXPIRED.
   */
  async runRenew(now: Date = new Date()): Promise<RenewRunResult> {
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
      const candidate = {
        userId: row.userId,
        planId: row.planId,
        status: row.status,
        autoRenew: row.autoRenew,
        startsAt: row.startsAt,
        expiresAt: row.expiresAt,
        billingPeriod: row.billingPeriod,
      };

      if (isExpireDue(candidate, now)) {
        row.status = 'EXPIRED';
        await this.subscriptions.save(row);
        result.expired += 1;
        result.results.push({
          userId: row.userId,
          action: 'expired',
          planId: row.planId,
          detail: 'autoRenew=false',
          expiresAt: row.expiresAt?.toISOString() ?? null,
        });
        continue;
      }

      if (!isRenewDue(candidate, now) || !row.expiresAt) continue;

      const period = resolveBillingPeriod(candidate);
      const plan = await this.plans.findById(row.planId);
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

      try {
        let transactionId: string | undefined;
        if (price > 0) {
          const periodLabel = period === 'yearly' ? 'год' : 'мес.';
          const charge = await this.billing.charge({
            userId: row.userId,
            amount: price,
            target: `plan-config.renew-plan:${row.planId}`,
            description: `Продление ${plan.title} (${periodLabel})`,
            idempotencyKey: renewIdempotencyKey(row.userId, row.expiresAt),
          });
          transactionId = charge.transactionId;
        }

        const next = nextExpiresAt(row.expiresAt, period, now);
        row.expiresAt = next;
        row.billingPeriod = period;
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
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.warn(`renew failed user=${row.userId}: ${detail}`);
        result.results.push({
          userId: row.userId,
          action: 'failed',
          planId: row.planId,
          detail: detail.slice(0, 200),
          expiresAt: row.expiresAt?.toISOString() ?? null,
        });
      }
    }

    if (result.scanned) {
      this.logger.log(
        `renew/run scanned=${result.scanned} renewed=${result.renewed} ` +
          `expired=${result.expired} failed=${result.failed}`,
      );
    }

    return result;
  }
}
