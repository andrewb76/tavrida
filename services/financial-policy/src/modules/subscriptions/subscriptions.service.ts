import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { PlansService } from '../plans/plans.service';

const DEFAULT_PLAN_ID = 'free';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly subscriptions: Repository<UserSubscriptionEntity>,
    private readonly plans: PlansService,
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

    if (price > 0) {
      // v1 scaffold: billing charge deferred until services/billing is wired
      throw new BadRequestException({
        type: 'billing_not_wired',
        detail: `Paid plan activation (${input.planId}, ${price} ₽) requires billing service`,
      });
    }

    const now = new Date();
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
    record.expiresAt = null;
    record.autoRenew = input.autoRenew ?? false;
    record.status = 'ACTIVE';

    await this.subscriptions.save(record);

    return {
      userId: record.userId,
      planId: record.planId,
      status: record.status,
      autoRenew: record.autoRenew,
      startsAt: record.startsAt.toISOString(),
      expiresAt: null,
      billingCharged: false,
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
