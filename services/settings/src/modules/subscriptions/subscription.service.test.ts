import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { BillingClient } from '../billing/billing-client.service';
import { SubscriptionService } from './subscription.service';

function makeSub(overrides: Partial<UserSubscriptionEntity> = {}): UserSubscriptionEntity {
  return {
    userId: 'u1',
    planId: 'basic',
    startsAt: new Date('2026-09-01'),
    expiresAt: null,
    autoRenew: false,
    billingPeriod: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserSubscriptionEntity;
}

function makePlan(overrides: Partial<PlanEntity> = {}): PlanEntity {
  return {
    id: 'basic',
    title: 'Basic',
    description: '',
    monthlyPrice: 500,
    yearlyPrice: 5000,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PlanEntity;
}

function matchWhere(where: Record<string, unknown>, item: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && '_type' in v) {
      const op = v as { _type: string; _value: unknown };
      const val = item[k];
      if (op._type === 'lessThanOrEqual') return (val as number) <= (op._value as number);
      return true;
    }
    return item[k] === v;
  });
}

function createHarness(opts: {
  subs?: UserSubscriptionEntity[];
  plans?: PlanEntity[];
  billingChargeResult?: { transactionId: string; status: string; balanceAfter: number };
  billingError?: Error;
} = {}) {
  const subs = [...(opts.subs ?? [])];
  const plans = [...(opts.plans ?? [])];

  function makeRepo<T>(store: T[]) {
    return {
      find: async (opts?: { where?: unknown; take?: number; order?: unknown }) => {
        if (!opts?.where) return [...store];
        const w = opts.where as Record<string, unknown>;
        return store
          .filter((item) => matchWhere(w, item as Record<string, unknown>))
          .slice(0, opts.take);
      },
      findOne: async (opts?: { where?: unknown }) => {
        if (!opts?.where) return store[0] ?? null;
        const w = opts.where as Record<string, unknown>;
        return (
          store.find((item) => matchWhere(w, item as Record<string, unknown>)) ?? null
        );
      },
      create: (data: T) => ({ ...data }) as T,
      save: async (entity: T) => {
        const idx = store.findIndex(
          (item) => (item as Record<string, unknown>).userId === (entity as Record<string, unknown>).userId,
        );
        if (idx >= 0) store[idx] = entity;
        else store.push(entity);
        return entity;
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const billing = {
    charge: async () => {
      if (opts.billingError) throw opts.billingError;
      return opts.billingChargeResult ?? { transactionId: 'tx-1', status: 'COMPLETED', balanceAfter: 0 };
    },
  } as unknown as BillingClient;

  const service = new SubscriptionService(
    makeRepo(subs) as Repository<UserSubscriptionEntity>,
    makeRepo(plans) as Repository<PlanEntity>,
    billing,
  );

  return { service, subs, plans };
}

describe('SubscriptionService', () => {
  describe('getByUser', () => {
    it('returns free plan when no subscription', async () => {
      const { service } = createHarness();
      const result = await service.getByUser('u1');
      assert.equal(result.planId, 'free');
      assert.equal(result.status, 'ACTIVE');
    });

    it('returns subscription data', async () => {
      const { service } = createHarness({
        subs: [makeSub({ planId: 'pro', expiresAt: new Date('2026-12-31') })],
      });
      const result = await service.getByUser('u1');
      assert.equal(result.planId, 'pro');
    });
  });

  describe('activate', () => {
    it('charges billing when price > 0', async () => {
      const { service, subs } = createHarness({
        plans: [makePlan({ monthlyPrice: 500 })],
      });
      const result = await service.activate({
        userId: 'u1',
        planId: 'basic',
        billingPeriod: 'monthly',
        autoRenew: true,
      });
      assert.equal(result.billingCharged, true);
      assert.equal(result.transactionId, 'tx-1');
      assert.equal(subs.length, 1);
      assert.equal(subs[0].planId, 'basic');
      assert.ok(subs[0].expiresAt);
    });

    it('skips billing when price is 0 (free plan)', async () => {
      const { service, subs } = createHarness({
        plans: [makePlan({ id: 'free', monthlyPrice: 0, yearlyPrice: 0 })],
      });
      const result = await service.activate({
        userId: 'u1',
        planId: 'free',
        billingPeriod: 'monthly',
      });
      assert.equal(result.billingCharged, false);
      assert.equal(result.transactionId, undefined);
      assert.equal(subs[0].expiresAt, null);
    });

    it('updates existing subscription', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ planId: 'basic' })],
        plans: [makePlan({ monthlyPrice: 0 }), makePlan({ id: 'pro', monthlyPrice: 0 })],
      });
      await service.activate({
        userId: 'u1',
        planId: 'pro',
        billingPeriod: 'yearly',
      });
      assert.equal(subs[0].planId, 'pro');
      assert.equal(subs[0].billingPeriod, 'yearly');
    });

    it('yearly adds 1 year', async () => {
      const { service, subs } = createHarness({
        plans: [makePlan({ yearlyPrice: 5000 })],
      });
      await service.activate({
        userId: 'u1',
        planId: 'basic',
        billingPeriod: 'yearly',
      });
      const expires = subs[0].expiresAt!.getTime();
      const yearMs = 365 * 86_400_000;
      assert.ok(expires > Date.now() + yearMs - 2000);
    });

    it('propagates billing insufficient balance error', async () => {
      const { service } = createHarness({
        plans: [makePlan({ monthlyPrice: 500 })],
        billingError: new Error('insufficient_balance'),
      });
      await assert.rejects(
        () => service.activate({ userId: 'u1', planId: 'basic', billingPeriod: 'monthly' }),
        { message: 'insufficient_balance' },
      );
    });
  });

  describe('cancelAutoRenew', () => {
    it('sets autoRenew to false', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ autoRenew: true })],
      });
      const result = await service.cancelAutoRenew('u1');
      assert.equal(result.updated, true);
      assert.equal(subs[0].autoRenew, false);
    });

    it('returns updated=false when no sub', async () => {
      const { service } = createHarness();
      const result = await service.cancelAutoRenew('u1');
      assert.equal(result.updated, false);
    });
  });

  describe('resolvePlanId', () => {
    it('returns free when no subscription', async () => {
      const { service } = createHarness();
      assert.equal(await service.resolvePlanId('u1'), 'free');
    });

    it('returns free when expired', async () => {
      const { service } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01') })],
      });
      assert.equal(await service.resolvePlanId('u1'), 'free');
    });

    it('returns free when status is EXPIRED', async () => {
      const { service } = createHarness({
        subs: [makeSub({ status: 'EXPIRED' })],
      });
      assert.equal(await service.resolvePlanId('u1'), 'free');
    });

    it('returns planId when active and not expired', async () => {
      const { service } = createHarness({
        subs: [makeSub({ planId: 'pro', status: 'ACTIVE', expiresAt: new Date('2099-12-31') })],
      });
      assert.equal(await service.resolvePlanId('u1'), 'pro');
    });
  });

  describe('renewDue', () => {
    it('expires subs without autoRenew', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: false })],
      });
      const result = await service.renewDue();
      assert.equal(result.expired, 1);
      assert.equal(result.renewed, 0);
      assert.equal(subs[0].status, 'EXPIRED');
    });

    it('renews subs with autoRenew and charges billing', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: 'monthly' })],
        plans: [makePlan({ monthlyPrice: 500 })],
      });
      const result = await service.renewDue();
      assert.equal(result.renewed, 1);
      assert.equal(result.failed, 0);
      assert.ok(result.results[0].transactionId);
      assert.ok(subs[0].expiresAt!.getTime() > Date.now());
    });

    it('marks failed when billing charge throws', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: 'monthly' })],
        plans: [makePlan({ monthlyPrice: 500 })],
        billingError: new Error('insufficient_balance'),
      });
      const result = await service.renewDue();
      assert.equal(result.failed, 1);
      assert.equal(result.renewed, 0);
      assert.equal(subs[0].status, 'EXPIRED');
      assert.equal(result.results[0].action, 'failed');
    });

    it('renews free plans without billing', async () => {
      const { service } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: 'monthly' })],
        plans: [makePlan({ monthlyPrice: 0, yearlyPrice: 0 })],
      });
      const result = await service.renewDue();
      assert.equal(result.renewed, 1);
      assert.equal(result.failed, 0);
    });

    it('defaults to monthly when billingPeriod is null', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: null })],
        plans: [makePlan({ monthlyPrice: 0 })],
      });
      const result = await service.renewDue();
      assert.equal(result.renewed, 1);
      assert.ok(subs[0].expiresAt!.getTime() > Date.now());
    });

    it('returns empty when nothing due', async () => {
      const { service } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2099-12-31') })],
      });
      const result = await service.renewDue();
      assert.equal(result.scanned, 0);
      assert.equal(result.renewed, 0);
      assert.equal(result.expired, 0);
    });

    it('marks failed when plan not found', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, planId: 'nonexistent' })],
        plans: [],
      });
      const result = await service.renewDue();
      assert.equal(result.failed, 1);
      assert.equal(subs[0].status, 'EXPIRED');
    });
  });
});
