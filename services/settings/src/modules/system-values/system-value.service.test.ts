import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { ParameterEntity } from '../../entities/parameter.entity';
import { SystemValueEntity } from '../../entities/system-value.entity';
import { SystemValueService } from './system-value.service';

function createHarness(opts: {
  values?: SystemValueEntity[];
  params?: ParameterEntity[];
} = {}) {
  const values = [...(opts.values ?? [])];
  const params = [...(opts.params ?? [])];

  function makeRepo<T>(store: T[]) {
    return {
      find: async (opts?: { where?: unknown; order?: unknown }) => {
        if (!opts?.where) return [...store];
        const whereArr = Array.isArray(opts.where) ? opts.where : [opts.where];
        return store.filter((item) =>
          whereArr.some((w) => {
            const entries = Object.entries(w as Record<string, unknown>);
            return entries.every(([k, v]) => {
              if (v && typeof v === 'object' && 'type' in (v as Record<string, unknown>)) {
                const likeVal = (v as { value: string }).value;
                const itemVal = String((item as Record<string, unknown>)[k] ?? '');
                const prefix = likeVal.replace(/%/g, '');
                return itemVal.startsWith(prefix);
              }
              return (item as Record<string, unknown>)[k] === v;
            });
          }),
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
        const idx = store.findIndex(
          (item) => (item as Record<string, unknown>).paramKey === (entity as Record<string, unknown>).paramKey,
        );
        if (idx >= 0) store[idx] = entity;
        else store.push(entity);
        return entity;
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const service = new SystemValueService(makeRepo(values) as Repository<SystemValueEntity>, makeRepo(params) as Repository<ParameterEntity>);

  return { service, values, params };
}

describe('SystemValueService', () => {
  describe('getDomain', () => {
    it('returns values with prefix stripped', async () => {
      const { service } = createHarness({
        values: [
          { paramKey: 'auction.lot.image.aspectWidth', value: 4 } as SystemValueEntity,
          { paramKey: 'auction.lot.image.aspectHeight', value: 3 } as SystemValueEntity,
        ],
      });
      const result = await service.getDomain('auction.lot.image');
      assert.equal(result.aspectWidth, 4);
      assert.equal(result.aspectHeight, 3);
    });

    it('returns empty object for unknown domain', async () => {
      const { service } = createHarness();
      const result = await service.getDomain('nonexistent');
      assert.deepEqual(result, {});
    });
  });

  describe('patchDomain', () => {
    it('saves values and returns domain', async () => {
      const { service, values } = createHarness({
        params: [
          { key: 'auction.lot.image.aspectWidth', category: 'system-var' } as ParameterEntity,
        ],
      });
      await service.patchDomain('auction.lot.image', { aspectWidth: 5 }, 'admin');
      assert.equal(values.length, 1);
      assert.equal(values[0].value, 5);
      assert.equal(values[0].updatedBy, 'admin');
    });

    it('throws NotFoundException for unknown param', async () => {
      const { service } = createHarness();
      await assert.rejects(
        () => service.patchDomain('auction', { unknown: 1 }),
        NotFoundException,
      );
    });
  });

  describe('getPublic', () => {
    it('returns only allowlisted keys', async () => {
      const { service } = createHarness({
        values: [
          { paramKey: 'club.registration.inviteOnly', value: true } as SystemValueEntity,
          { paramKey: 'auction.lot.image.aspectWidth', value: 4 } as SystemValueEntity,
          { paramKey: 'secret.admin.key', value: 'hidden' } as SystemValueEntity,
        ],
      });
      const result = await service.getPublic();
      assert.equal(result['club.registration.inviteOnly'], true);
      assert.equal(result['auction.lot.image.aspectWidth'], 4);
      assert.equal(result['secret.admin.key'], undefined);
    });
  });

  describe('getOne', () => {
    it('returns value', async () => {
      const { service } = createHarness({
        values: [{ paramKey: 'k1', value: 42 } as SystemValueEntity],
      });
      const result = await service.getOne('k1');
      assert.equal(result.value, 42);
    });

    it('throws NotFoundException', async () => {
      const { service } = createHarness();
      await assert.rejects(() => service.getOne('unknown'), NotFoundException);
    });
  });

  describe('upsert', () => {
    it('creates new value', async () => {
      const { service, values } = createHarness();
      await service.upsert('k1', 10, 'admin');
      assert.equal(values.length, 1);
      assert.equal(values[0].value, 10);
    });

    it('updates existing value', async () => {
      const { service, values } = createHarness({
        values: [{ paramKey: 'k1', value: 10, updatedBy: null } as SystemValueEntity],
      });
      await service.upsert('k1', 20, 'admin');
      assert.equal(values[0].value, 20);
      assert.equal(values[0].updatedBy, 'admin');
    });
  });
});
