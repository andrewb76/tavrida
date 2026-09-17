import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { ParameterEntity } from '../../entities/parameter.entity';
import { PlanValueEntity } from '../../entities/plan-value.entity';
import { ParameterService } from './parameter.service';

function createHarness(opts: {
  params?: ParameterEntity[];
  planValues?: PlanValueEntity[];
} = {}) {
  const params = [...(opts.params ?? [])];
  const planValues = [...(opts.planValues ?? [])];
  const deletedParams: string[] = [];
  const deletedPlanValues: string[] = [];

  function makeRepo<T>(store: T[], idKeys: string[]) {
    return {
      find: async (opts?: { where?: unknown; order?: unknown }) => {
        if (!opts?.where) return [...store];
        const whereArr = Array.isArray(opts.where) ? opts.where : [opts.where];
        return store.filter((item) =>
          whereArr.some((w) =>
            Object.entries(w as Record<string, unknown>).every(
              ([k, v]) => (item as Record<string, unknown>)[k] === v,
            ),
          ),
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
        if ('key' in w) deletedParams.push(w.key as string);
        if ('paramKey' in w) deletedPlanValues.push(w.paramKey as string);
        const idx = store.findIndex((item) =>
          Object.entries(w).every(([k, v]) => (item as Record<string, unknown>)[k] === v),
        );
        if (idx >= 0) store.splice(idx, 1);
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const service = new ParameterService(
    makeRepo(params, ['key']) as Repository<ParameterEntity>,
    makeRepo(planValues, ['planId', 'paramKey']) as Repository<PlanValueEntity>,
  );

  return { service, params, planValues, deletedParams, deletedPlanValues };
}

describe('ParameterService', () => {
  describe('register', () => {
    it('creates new parameter', async () => {
      const { service, params } = createHarness();
      await service.register({
        key: 'auction.lot.create',
        service: 'auction',
        category: 'limited-user-var',
        name: 'Create lots',
        paramType: 'int',
        defaultValue: { periods: [{ period: 'day', max_value: 10 }] },
      });
      assert.equal(params.length, 1);
      assert.equal(params[0].syncStatus, 'active');
    });

    it('updates existing parameter', async () => {
      const { service, params } = createHarness({
        params: [{ key: 'k1', name: 'old', syncStatus: 'stale' } as ParameterEntity],
      });
      await service.register({
        key: 'k1',
        service: 'auction',
        category: 'system-var',
        name: 'new',
        paramType: 'string',
        defaultValue: null,
      });
      assert.equal(params[0].name, 'new');
      assert.equal(params[0].syncStatus, 'active');
    });

    it('upserts plan values when provided', async () => {
      const { service, planValues } = createHarness();
      await service.register({
        key: 'k1',
        service: 'auction',
        category: 'tarif-var',
        name: 'test',
        paramType: 'int',
        defaultValue: 0,
        planValues: { free: 0, pro: 100 },
      });
      assert.equal(planValues.length, 2);
    });
  });

  describe('sync', () => {
    it('syncs new params and marks stale ones', async () => {
      const { service, params } = createHarness({
        params: [{ key: 'old-key', service: 'auction', syncStatus: 'active' } as ParameterEntity],
      });
      const result = await service.sync({
        service: 'auction',
        parameters: [
          { key: 'k1', service: 'auction', category: 'system-var', name: 'new', paramType: 'int', defaultValue: null },
        ],
      });
      assert.equal(result.synced, 1);
      assert.deepEqual(result.stale, ['old-key']);
      assert.equal(params.find((p) => p.key === 'old-key')?.syncStatus, 'stale');
    });
  });

  describe('list', () => {
    it('returns all params', async () => {
      const { service } = createHarness({
        params: [
          { key: 'k1', sortOrder: 0 } as ParameterEntity,
          { key: 'k2', sortOrder: 1 } as ParameterEntity,
        ],
      });
      const { data } = await service.list();
      assert.equal(data.length, 2);
    });
  });

  describe('findOne', () => {
    it('returns param', async () => {
      const { service } = createHarness({
        params: [{ key: 'k1' } as ParameterEntity],
      });
      const result = await service.findOne('k1');
      assert.equal(result.key, 'k1');
    });

    it('throws NotFoundException', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.findOne('unknown'), NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes param and cascades plan values', async () => {
      const { service, params, deletedPlanValues } = createHarness({
        params: [{ key: 'k1' } as ParameterEntity],
      });
      await service.remove('k1');
      assert.equal(params.length, 0);
      assert.deepEqual(deletedPlanValues, ['k1']);
    });

    it('throws NotFoundException', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.remove('unknown'), NotFoundException);
    });
  });
});
