import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';
import { UserSubscriptionEntity } from '../../entities/user-subscription.entity';
import { UserValueEntity } from '../../entities/user-value.entity';
import { UserValueService } from './user-value.service';

function createHarness(opts: {
  userValues?: UserValueEntity[];
  params?: ParameterEntity[];
  systemValues?: SystemValueEntity[];
  planValues?: PlanValueEntity[];
  subs?: UserSubscriptionEntity[];
} = {}) {
  const userValues = [...(opts.userValues ?? [])];
  const params = [...(opts.params ?? [])];
  const systemValues = [...(opts.systemValues ?? [])];
  const planValues = [...(opts.planValues ?? [])];
  const subs = [...(opts.subs ?? [])];
  const deleted: Array<{ userId: string; paramKey: string }> = [];

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
      save: async (entity: T) => {
        const idx = store.findIndex((item) =>
          idKeys.every((k) => (item as Record<string, unknown>)[k] === (entity as Record<string, unknown>)[k]),
        );
        if (idx >= 0) store[idx] = entity;
        else store.push(entity);
        return entity;
      },
      delete: async (where: unknown) => {
        const w = where as Record<string, unknown>;
        deleted.push(w as { userId: string; paramKey: string });
        const idx = store.findIndex((item) =>
          Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
        );
        if (idx >= 0) store.splice(idx, 1);
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const service = new UserValueService(
    makeRepo(userValues, ['userId', 'paramKey']) as Repository<UserValueEntity>,
    makeRepo(params, ['key']) as Repository<ParameterEntity>,
    makeRepo(systemValues, ['paramKey']) as Repository<SystemValueEntity>,
    makeRepo(planValues, ['planId', 'paramKey']) as Repository<PlanValueEntity>,
    makeRepo(subs, ['userId']) as Repository<UserSubscriptionEntity>,
  );

  return { service, userValues, params, systemValues, planValues, subs, deleted };
}

describe('UserValueService', () => {
  describe('getValues', () => {
    it('returns all user values', async () => {
      const { service } = createHarness({
        userValues: [
          { userId: 'u1', paramKey: 'k1', value: 10 } as UserValueEntity,
          { userId: 'u1', paramKey: 'k2', value: 20 } as UserValueEntity,
        ],
      });
      const { data } = await service.getValues('u1');
      assert.equal(data.length, 2);
    });

    it('returns empty when no values', async () => {
      const { service } = createHarness();
      const { data } = await service.getValues('u1');
      assert.equal(data.length, 0);
    });
  });

  describe('getValue', () => {
    it('returns value', async () => {
      const { service } = createHarness({
        userValues: [{ userId: 'u1', paramKey: 'k1', value: 42 } as UserValueEntity],
      });
      const result = await service.getValue('u1', 'k1');
      assert.equal(result.value, 42);
    });

    it('throws NotFoundException when missing', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.getValue('u1', 'k1'), NotFoundException);
    });
  });

  describe('upsert', () => {
    it('creates new value', async () => {
      const { service, userValues } = createHarness();
      await service.upsert('u1', 'k1', 'hello');
      assert.equal(userValues.length, 1);
      assert.equal(userValues[0].value, 'hello');
    });

    it('updates existing value', async () => {
      const { service, userValues } = createHarness({
        userValues: [{ userId: 'u1', paramKey: 'k1', value: 'old' } as UserValueEntity],
      });
      await service.upsert('u1', 'k1', 'new');
      assert.equal(userValues[0].value, 'new');
    });
  });

  describe('remove', () => {
    it('removes existing value', async () => {
      const { service, userValues, deleted } = createHarness({
        userValues: [{ userId: 'u1', paramKey: 'k1', value: 10 } as UserValueEntity],
      });
      const result = await service.remove('u1', 'k1');
      assert.equal(result.deleted, true);
      assert.equal(userValues.length, 0);
      assert.equal(deleted.length, 1);
    });

    it('throws NotFoundException when missing', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.remove('u1', 'k1'), NotFoundException);
    });
  });

  describe('resolveForUser', () => {
    it('returns user_value when override exists', async () => {
      const { service } = createHarness({
        userValues: [{ userId: 'u1', paramKey: 'k1', value: 99 } as UserValueEntity],
      });
      const result = await service.resolveForUser('u1', 'k1');
      assert.equal(result.source, 'user_value');
      assert.equal(result.value, 99);
    });

    it('falls back to system_value for system-var', async () => {
      const { service } = createHarness({
        params: [{ key: 'k1', category: 'system-var', defaultValue: 10 } as ParameterEntity],
        systemValues: [{ paramKey: 'k1', value: 20 } as SystemValueEntity],
      });
      const result = await service.resolveForUser('u1', 'k1');
      assert.equal(result.source, 'system_value');
      assert.equal(result.value, 20);
    });

    it('falls back to param.defaultValue for system-var with no system_value', async () => {
      const { service } = createHarness({
        params: [{ key: 'k1', category: 'system-var', defaultValue: 10 } as ParameterEntity],
      });
      const result = await service.resolveForUser('u1', 'k1');
      assert.equal(result.source, 'system_value');
      assert.equal(result.value, 10);
    });

    it('falls back to plan_value for tarif-var with active sub', async () => {
      const { service } = createHarness({
        params: [{ key: 'k1', category: 'tarif-var' } as ParameterEntity],
        subs: [{ userId: 'u1', planId: 'basic', status: 'ACTIVE' } as UserSubscriptionEntity],
        planValues: [{ planId: 'basic', paramKey: 'k1', value: 50 } as PlanValueEntity],
      });
      const result = await service.resolveForUser('u1', 'k1');
      assert.equal(result.source, 'plan_value');
      assert.equal(result.value, 50);
    });

    it('falls back to default_value for tarif-var with no sub', async () => {
      const { service } = createHarness({
        params: [{ key: 'k1', category: 'tarif-var', defaultValue: 0 } as ParameterEntity],
      });
      const result = await service.resolveForUser('u1', 'k1');
      assert.equal(result.source, 'default_value');
      assert.equal(result.value, 0);
    });

    it('throws NotFoundException for unknown param', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.resolveForUser('u1', 'unknown'), NotFoundException);
    });
  });
});
