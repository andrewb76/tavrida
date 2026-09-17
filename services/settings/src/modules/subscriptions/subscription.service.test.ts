import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { PlanEntity } from '../../entities/plan.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
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

function createHarness(opts: {
  subs?: UserSubscriptionEntity[];
  plans?: PlanEntity[];
} = {}) {
  const subs = [...(opts.subs ?? [])];
  const plans = [...(opts.plans ?? [])];

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
        return (
          store.find((item) => {
            const w = opts.where as Record<string, unknown>;
            return Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v);
          }) ?? null
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
      remove: async (entity: T) => {
        const idx = store.findIndex(
          (item) => (item as Record<string, unknown>).userId === (entity as Record<string, unknown>).userId,
        );
        if (idx >= 0) store.splice(idx, 1);
        return entity;
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const subsRepo = makeRepo<UserSubscriptionEntity>(subs);
  const plansRepo = makeRepo<PlanEntity>(plans);

  const service = new SubscriptionService(subsRepo as Repository<UserSubscriptionEntity>, plansRepo as Repository<PlanEntity>);

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
    it('creates new subscription', async () => {
      const { service, subs } = createHarness();
      await service.activate({
        userId: 'u1',
        planId: 'pro',
        billingPeriod: 'monthly',
        autoRenew: true,
      });
      assert.equal(subs.length, 1);
      assert.equal(subs[0].planId, 'pro');
      assert.equal(subs[0].status, 'ACTIVE');
      assert.equal(subs[0].autoRenew, true);
      assert.ok(subs[0].expiresAt);
    });

    it('updates existing subscription', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ planId: 'basic' })],
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
      const { service, subs } = createHarness();
      await service.activate({
        userId: 'u1',
        planId: 'pro',
        billingPeriod: 'yearly',
      });
      const expires = subs[0].expiresAt!.getTime();
      const yearMs = 365 * 86_400_000;
      assert.ok(expires > Date.now() + yearMs - 2000);
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

    it('renews subs with autoRenew', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: 'monthly' })],
      });
      const result = await service.renewDue();
      assert.equal(result.renewed, 1);
      assert.equal(result.expired, 0);
      assert.ok(subs[0].expiresAt!.getTime() > Date.now());
    });

    it('defaults to monthly when billingPeriod is null', async () => {
      const { service, subs } = createHarness({
        subs: [makeSub({ expiresAt: new Date('2020-01-01'), autoRenew: true, billingPeriod: null })],
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
  });
});
