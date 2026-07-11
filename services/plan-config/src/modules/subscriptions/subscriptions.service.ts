import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { BillingClient } from '../billing/billing.client';
import { PlansService } from '../plans/plans.service';

const DEFAULT_PLAN_ID = 'free';

function addBillingPeriod(date: Date, period: 'monthly' | 'yearly'): Date {
  const next = new Date(date);
  if (period === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
    private readonly plans: PlansService,
    private readonly billing: BillingClient,
  ) {}

  async resolvePlanId(userId: string): Promise<string> {
    const sub = await this.subscriptions.findOne({ where: { userId } });
    if (!sub || sub.status !== 'ACTIVE') return DEFAULT_PLAN_ID;
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
        startsAt: null,
        expiresAt: null,
      };
    }

    return {
      userId: sub.userId,
      planId: sub.planId,
      status: sub.status,
      autoRenew: sub.autoRenew,
      startsAt: sub.startsAt.toISOString(),
      expiresAt: sub.expiresAt?.toISOString() ?? null,
    };
  }

  async activate(input: {
    userId: string;
    planId: string;
    autoRenew?: boolean;
    billingPeriod?: 'monthly' | 'yearly';
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
        target: `financial-policy.activate-plan:${input.planId}`,
        description: `${plan.title} (${periodLabel})`,
        idempotencyKey: randomUUID(),
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
        status: 'ACTIVE',
      });

    record.planId = input.planId;
    record.startsAt = now;
    record.expiresAt = expiresAt;
    record.autoRenew = input.autoRenew ?? false;
    record.status = 'ACTIVE';

    await this.subscriptions.save(record);

    return {
      userId: record.userId,
      planId: record.planId,
      status: record.status,
      autoRenew: record.autoRenew,
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
}
