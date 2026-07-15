import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Repository } from 'typeorm';
import type { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import type { BillingClient } from '../billing/billing.client';
import type { PlansService } from '../plans/plans.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService.runRenew', () => {
  it('charges and extends autoRenew due; expires others; fails mark EXPIRED', async () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const rows: UserSubscriptionEntity[] = [
      {
        userId: 'u-renew',
        planId: 'basic',
        startsAt: new Date('2026-06-16T00:00:00.000Z'),
        expiresAt: new Date('2026-07-16T00:00:00.000Z'),
        autoRenew: true,
        billingPeriod: 'monthly',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'u-expire',
        planId: 'basic',
        startsAt: new Date('2026-06-16T00:00:00.000Z'),
        expiresAt: new Date('2026-07-16T00:00:00.000Z'),
        autoRenew: false,
        billingPeriod: 'monthly',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'u-fail',
        planId: 'pro',
        startsAt: new Date('2026-06-16T00:00:00.000Z'),
        expiresAt: new Date('2026-07-16T00:00:00.000Z'),
        autoRenew: true,
        billingPeriod: 'monthly',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const saved: UserSubscriptionEntity[] = [];
    const repo = {
      find: async () => rows,
      save: async (row: UserSubscriptionEntity) => {
        saved.push({ ...row });
        return row;
      },
    } as unknown as Repository<UserSubscriptionEntity>;

    const plans = {
      findById: async (id: string) => {
        if (id === 'basic') {
          return { id: 'basic', title: 'Basic', monthlyPrice: '99', yearlyPrice: '990' };
        }
        if (id === 'pro') {
          return { id: 'pro', title: 'Pro', monthlyPrice: '399', yearlyPrice: '3990' };
        }
        return null;
      },
    } as unknown as PlansService;

    const charges: string[] = [];
    const billing = {
      charge: async (input: { userId: string; target: string; idempotencyKey?: string }) => {
        charges.push(input.userId);
        if (input.userId === 'u-fail') {
          throw new Error('insufficient balance');
        }
        assert.match(input.target, /^plan-config\.renew-plan:/);
        assert.ok(input.idempotencyKey?.startsWith('plan-config.renew:'));
        return { transactionId: `tx-${input.userId}`, status: 'ok', balanceAfter: 1 };
      },
    } as unknown as BillingClient;

    const service = new SubscriptionsService(repo, plans, billing);
    const out = await service.runRenew(now);

    assert.equal(out.scanned, 3);
    assert.equal(out.renewed, 1);
    assert.equal(out.expired, 1);
    assert.equal(out.failed, 1);
    assert.deepEqual(charges, ['u-renew', 'u-fail']);
    assert.equal(rows[0]?.status, 'ACTIVE');
    assert.ok(rows[0]?.expiresAt && rows[0].expiresAt > now);
    assert.equal(rows[1]?.status, 'EXPIRED');
    assert.equal(rows[2]?.status, 'EXPIRED');
    assert.equal(saved.length, 3);
  });
});
