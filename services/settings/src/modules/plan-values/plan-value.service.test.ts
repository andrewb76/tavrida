import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanEntity } from '../../entities/plan.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { PlanService } from './plan.service';
import { PlanValueService } from './plan-value.service';

function createHarness(opts: {
  planValues?: PlanValueEntity[];
  params?: ParameterEntity[];
  plans?: PlanEntity[];
  subs?: UserSubscriptionEntity[];
} = {}) {
  const planValues = [...(opts.planValues ?? [])];
  const params = [...(opts.params ?? [])];
  const plans = [...(opts.plans ?? [{ id: 'free', title: 'Free', monthlyPrice: 0, yearlyPrice: 0 } as PlanEntity])];
  const subs = [...(opts.subs ?? [])];

  function makeRepo<T>(store: T[], idKeys: string[]) {
    return {
      find: async (opts?: { where?: unknown }) => {
        if (!opts?.where) return [...store];
        const w = opts.where as Record<string, unknown>;
        return store.filter((item) =>
          Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
        );
      },
      findOne: async (opts?: { where?: unknown }) => {
        if (!opts?.where) return store[0] ?? null;
        const w = opts.where as Record<string, unknown>;
        return (
          store.find((item) =>
            Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
          ) ?? null
        );
      },
      create: (data: T) => ({ ...data }) as T,
      save: async (entity: T) => {
        const idx = store.findIndex((item) =>
          idKeys.every((k) => (item as Record<string, unknown>)[k] === (entity as Record<string, unknown>)[k]),
        );
        if (idx >= 0) store[idx] = entity;
        else store.push(entity);
        return entity;
      },
      createQueryBuilder: () => {
        const qb: Record<string, unknown> = {
          andWhere: (_sql: string, params?: Record<string, unknown>) => {
            void params;
            return qb;
          },
          innerJoin: () => qb,
          addSelect: () => qb,
          getMany: async () => [...planValues],
        };
        return () => qb;
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const valuesRepo = makeRepo(planValues, ['planId', 'paramKey']);
  const paramsRepo = makeRepo(params, ['key']);
  const subsRepo = makeRepo(subs, ['userId']);

  const planService = new PlanService(makeRepo(plans, ['id']) as Repository<PlanEntity>, subsRepo as Repository<UserSubscriptionEntity>);
  const service = new PlanValueService(valuesRepo as Repository<PlanValueEntity>, paramsRepo as Repository<ParameterEntity>, planService);

  return { service, planValues, params, plans, planService };
}

describe('PlanValueService', () => {
  describe('resolve', () => {
    it('returns plan value for user with active sub', async () => {
      const { service } = createHarness({
        planValues: [{ planId: 'pro', paramKey: 'k1', value: 100 } as PlanValueEntity],
        subs: [{ userId: 'u1', planId: 'pro', status: 'ACTIVE' } as UserSubscriptionEntity],
      });
      const result = await service.resolve('u1', 'k1');
      assert.equal(result.planId, 'pro');
      assert.equal(result.value, 100);
    });

    it('returns null when no plan value exists', async () => {
      const { service } = createHarness({
        subs: [{ userId: 'u1', planId: 'free', status: 'ACTIVE' } as UserSubscriptionEntity],
      });
      const result = await service.resolve('u1', 'k1');
      assert.equal(result.value, null);
    });

    it('defaults to free plan when no sub', async () => {
      const { service } = createHarness();
      const result = await service.resolve('u1', 'k1');
      assert.equal(result.planId, 'free');
    });
  });

  describe('resolvePrice', () => {
    it('includes plan prices', async () => {
      const { service } = createHarness({
        plans: [
          { id: 'pro', title: 'Pro', monthlyPrice: 500, yearlyPrice: 5000 } as PlanEntity,
        ],
        planValues: [{ planId: 'pro', paramKey: 'k1', value: 42 } as PlanValueEntity],
        subs: [{ userId: 'u1', planId: 'pro', status: 'ACTIVE' } as UserSubscriptionEntity],
      });
      const result = await service.resolvePrice('u1', 'k1');
      assert.equal(result.monthlyPrice, 500);
      assert.equal(result.yearlyPrice, 5000);
    });
  });

  describe('upsert', () => {
    it('creates new plan value', async () => {
      const { service, planValues } = createHarness();
      await service.upsert('pro', 'k1', 42);
      assert.equal(planValues.length, 1);
      assert.equal(planValues[0].value, 42);
    });

    it('updates existing plan value', async () => {
      const { service, planValues } = createHarness({
        planValues: [{ planId: 'pro', paramKey: 'k1', value: 10 } as PlanValueEntity],
      });
      await service.upsert('pro', 'k1', 99);
      assert.equal(planValues[0].value, 99);
    });
  });
});
