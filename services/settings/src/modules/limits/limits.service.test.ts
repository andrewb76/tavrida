import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { LimitPurchaseEntity } from '../../entities/limit-purchase.entity';
import { LimitUsageLogEntity } from '../../entities/limit-usage-log.entity';
import { ParameterEntity } from '../../entities/parameter.entity';
import { UserLimitEntity } from '../../entities/user-limit.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { LimitsService } from './limits.service';

function makeLimit(overrides: Partial<UserLimitEntity> = {}): UserLimitEntity {
  const now = new Date();
  return {
    paramKey: 'auction.lot.create',
    planId: 'free',
    userId: 'u1',
    period: 'day',
    maxValue: 10,
    remaining: 10,
    cycleStart: now,
    cycleEnd: new Date(now.getTime() + 86_400_000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as UserLimitEntity;
}

function makeParam(overrides: Partial<ParameterEntity> = {}): ParameterEntity {
  return {
    key: 'auction.lot.create',
    service: 'auction',
    category: 'limited-user-var',
    name: 'Create lots',
    description: '',
    paramType: 'int',
    defaultValue: { periods: [{ period: 'day', max_value: 10 }] },
    userOverride: false,
    sortOrder: 0,
    syncStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ParameterEntity;
}

function makeSub(overrides: Partial<UserSubscriptionEntity> = {}): UserSubscriptionEntity {
  return {
    userId: 'u1',
    planId: 'basic',
    startsAt: new Date(),
    expiresAt: null,
    autoRenew: false,
    billingPeriod: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserSubscriptionEntity;
}

function makePurchase(overrides: Partial<LimitPurchaseEntity> = {}): LimitPurchaseEntity {
  return {
    id: 'pur-1',
    paramKey: 'auction.lot.create',
    userId: 'u1',
    period: 'day',
    purchased: 5,
    used: 0,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    meta: null,
    ...overrides,
  } as LimitPurchaseEntity;
}

function createHarness(opts: {
  params?: ParameterEntity[];
  limits?: UserLimitEntity[];
  subs?: UserSubscriptionEntity[];
  purchases?: LimitPurchaseEntity[];
} = {}) {
  const params = [...(opts.params ?? [])];
  const limits = [...(opts.limits ?? [])];
  const subs = [...(opts.subs ?? [])];
  const purchases = [...(opts.purchases ?? [])];
  const logs: LimitUsageLogEntity[] = [];

  function makeRepo<T>(store: T[], matchFn?: (a: Partial<T>, b: T) => boolean) {
    const defaultMatch = (where: Record<string, unknown>, item: Record<string, unknown>) =>
      Object.entries(where).every(([k, v]) => item[k] === v);

    return {
      find: async (opts?: { where?: unknown; order?: unknown }) => {
        if (!opts?.where) return [...store];
        const w = Array.isArray(opts.where) ? opts.where : [opts.where];
        return store.filter((item) =>
          w.some((condition) => {
            if (matchFn) return matchFn(condition as Partial<T>, item as T);
            return defaultMatch(condition as Record<string, unknown>, item as Record<string, unknown>);
          }),
        );
      },
      findOne: async (opts?: { where?: unknown }) => {
        if (!opts?.where) return store[0] ?? null;
        return (
          store.find((item) =>
            defaultMatch(opts.where as Record<string, unknown>, item as Record<string, unknown>),
          ) ?? null
        );
      },
      create: (data: T) => ({ ...data }) as T,
      save: async (entity: T) => {
        const idx = store.findIndex((item) => {
          const a = entity as Record<string, unknown>;
          const b = item as Record<string, unknown>;
          return Object.keys(opts?.limits ? { paramKey: 1, planId: 1, userId: 1, period: 1 } : {}).every(
            (k) => a[k] === b[k],
          );
        });
        if (idx >= 0) store[idx] = entity;
        else store.push(entity);
        return entity;
      },
      delete: async (where: unknown) => {
        const w = where as Record<string, unknown>;
        const idx = store.findIndex((item) =>
          Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
        );
        if (idx >= 0) store.splice(idx, 1);
      },
      createQueryBuilder: (() => {
        const qb: Record<string, unknown> = {
          andWhere: (sql: string, params?: Record<string, unknown>) => {
            void sql;
            void params;
            return qb;
          },
          innerJoin: () => qb,
          addSelect: () => qb,
          orderBy: (col: string, dir: string) => {
            void col; void dir;
            return qb;
          },
          skip: (n: number) => { void n; return qb; },
          take: (n: number) => { void n; return qb; },
          getCount: async () => store.length,
          getMany: async () => [...store],
        };
        return () => qb;
      })(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const userLimitsRepo = makeRepo<UserLimitEntity>(limits);
  const usageLogsRepo = makeRepo<LimitUsageLogEntity>(logs);
  const purchasesRepo = makeRepo<LimitPurchaseEntity>(purchases);
  const parametersRepo = makeRepo<ParameterEntity>(params);
  const subscriptionsRepo = makeRepo<UserSubscriptionEntity>(subs);

  const service = new LimitsService(
    userLimitsRepo as Repository<UserLimitEntity>,
    usageLogsRepo as Repository<LimitUsageLogEntity>,
    purchasesRepo as Repository<LimitPurchaseEntity>,
    parametersRepo as Repository<ParameterEntity>,
    subscriptionsRepo as Repository<UserSubscriptionEntity>,
  );

  return { service, limits, subs, params, purchases, logs };
}

describe('LimitsService', () => {
  describe('calculateCycleEnd', () => {
    it('hour', () => {
      const { service } = createHarness();
      const start = new Date('2026-09-15T10:00:00Z');
      const end = service.calculateCycleEnd(start, 'hour');
      assert.equal(end.getTime() - start.getTime(), 3_600_000);
    });

    it('day', () => {
      const { service } = createHarness();
      const start = new Date('2026-09-15T10:00:00Z');
      const end = service.calculateCycleEnd(start, 'day');
      assert.equal(end.getTime() - start.getTime(), 86_400_000);
    });

    it('week', () => {
      const { service } = createHarness();
      const start = new Date('2026-09-15T10:00:00Z');
      const end = service.calculateCycleEnd(start, 'week');
      assert.equal(end.getTime() - start.getTime(), 7 * 86_400_000);
    });

    it('month', () => {
      const { service } = createHarness();
      const start = new Date('2026-09-15T10:00:00Z');
      const end = service.calculateCycleEnd(start, 'month');
      assert.equal(end.getMonth() - start.getMonth(), 1);
    });
  });

  describe('restoreIfNeeded', () => {
    it('restores when cycle expired', async () => {
      const { service, limits } = createHarness({
        limits: [makeLimit({ remaining: 3, cycleEnd: new Date(Date.now() - 1000) })],
      });
      const result = await service.restoreIfNeeded(limits[0]);
      assert.equal(result.remaining, 10);
      assert.ok(result.cycleEnd.getTime() > Date.now());
    });

    it('does not restore when cycle still active', async () => {
      const { service, limits } = createHarness({
        limits: [makeLimit({ remaining: 3 })],
      });
      const result = await service.restoreIfNeeded(limits[0]);
      assert.equal(result.remaining, 3);
    });
  });

  describe('check', () => {
    it('returns allowed when base remaining > 0', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 5 })],
      });
      const { results } = await service.check({ userId: 'u1', key: 'auction.lot.create' });
      assert.equal(results.length, 1);
      assert.equal(results[0].allowed, true);
      assert.equal(results[0].remaining, 5);
    });

    it('returns allowed when base=0 but purchased available', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 0 })],
        purchases: [makePurchase({ purchased: 3, used: 0 })],
      });
      const { results } = await service.check({ userId: 'u1', key: 'auction.lot.create' });
      assert.equal(results[0].allowed, true);
      assert.equal(results[0].remaining, 0);
      assert.equal(results[0].purchasedAvailable, 3);
    });

    it('returns not allowed when exhausted', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 0 })],
      });
      const { results } = await service.check({ userId: 'u1', key: 'auction.lot.create' });
      assert.equal(results[0].allowed, false);
    });
  });

  describe('consume', () => {
    it('consumes from base', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 5 })],
      });
      const { results } = await service.consume({ userId: 'u1', key: 'auction.lot.create', amount: 1 });
      assert.equal(results.length, 1);
      assert.equal(results[0].ok, true);
      assert.equal(results[0].remaining, 4);
    });

    it('falls back to purchased when base exhausted', async () => {
      const { service, purchases } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 0 })],
        purchases: [makePurchase({ purchased: 5, used: 0 })],
      });
      const { results } = await service.consume({ userId: 'u1', key: 'auction.lot.create', amount: 1 });
      assert.equal(results[0].ok, true);
      assert.equal(purchases[0].used, 1);
    });

    it('returns limit-exhausted when both base and purchased are empty', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 0 })],
      });
      const { results } = await service.consume({ userId: 'u1', key: 'auction.lot.create', amount: 1 });
      assert.equal(results[0].ok, false);
      assert.equal(results[0].error, 'limit-exhausted');
    });

    it('throws BadRequestException for unknown param', async () => {
      const { service } = createHarness();
      await assert.rejects(
        () => service.consume({ userId: 'u1', key: 'nonexistent', amount: 1 }),
        BadRequestException,
      );
    });
  });

  describe('grant', () => {
    it('creates new limit entity when none exists', async () => {
      const { service, limits } = createHarness({
        params: [makeParam()],
      });
      const { granted, remaining } = await service.grant({
        userId: 'u1',
        key: 'auction.lot.create',
        period: 'day',
        amount: 5,
        source: 'grant',
        reason: 'bonus',
      });
      assert.equal(granted, true);
      assert.equal(remaining, 15);
      assert.equal(limits.length, 1);
    });

    it('adds to existing limit', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ remaining: 3 })],
      });
      const { remaining } = await service.grant({
        userId: 'u1',
        key: 'auction.lot.create',
        period: 'day',
        amount: 2,
        source: 'grant',
      });
      assert.equal(remaining, 5);
    });
  });

  describe('resolvePlanId (private, tested via consume)', () => {
    it('uses subscription planId', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ planId: 'basic', remaining: 5 })],
        subs: [makeSub({ planId: 'basic', status: 'ACTIVE' })],
      });
      const { results } = await service.consume({ userId: 'u1', key: 'auction.lot.create', amount: 1 });
      assert.equal(results[0].ok, true);
    });

    it('defaults to free when no subscription', async () => {
      const { service } = createHarness({
        params: [makeParam()],
        limits: [makeLimit({ planId: 'free', remaining: 5 })],
      });
      const { results } = await service.consume({ userId: 'u1', key: 'auction.lot.create', amount: 1 });
      assert.equal(results[0].ok, true);
    });
  });
});
