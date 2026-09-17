import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { UserLimitEntity } from '../../entities/user-limit.entity';
import { LimitsService } from './limits.service';
import { LimitsRestoreService } from './limits-restore.service';

function createHarness(opts: {
  expiredLimits?: UserLimitEntity[];
} = {}) {
  const expiredLimits = [...(opts.expiredLimits ?? [])];

  const userLimitsRepo = {
    find: async () => expiredLimits,
    findOne: async () => null,
    save: async (e: UserLimitEntity) => e,
    create: (d: UserLimitEntity) => d,
  } as unknown as Repository<UserLimitEntity>;

  const limitsService = {
    restoreIfNeeded: async (entity: UserLimitEntity) => {
      entity.remaining = entity.maxValue;
      return entity;
    },
  } as unknown as LimitsService;

  const service = new LimitsRestoreService(userLimitsRepo, limitsService);

  return { service };
}

describe('LimitsRestoreService', () => {
  it('restores expired cycles', async () => {
    const { service } = createHarness({
      expiredLimits: [
        { paramKey: 'k1', userId: 'u1', period: 'day', maxValue: 10, remaining: 0 } as UserLimitEntity,
      ],
    });
    const result = await service.handleExpiredCycles();
    assert.equal(result.restored, 1);
    assert.equal(result.errors, 0);
  });

  it('returns 0 when nothing expired', async () => {
    const { service } = createHarness();
    const result = await service.handleExpiredCycles();
    assert.equal(result.restored, 0);
  });

  it('handles errors gracefully', async () => {
    const userLimitsRepo = {
      find: async () => [
        { paramKey: 'k1', userId: 'u1', period: 'day', maxValue: 10, remaining: 0 } as UserLimitEntity,
      ],
      findOne: async () => null,
      save: async (e: UserLimitEntity) => e,
      create: (d: UserLimitEntity) => d,
    } as unknown as Repository<UserLimitEntity>;

    const limitsService = {
      restoreIfNeeded: async () => {
        throw new Error('DB error');
      },
    } as unknown as LimitsService;

    const service = new LimitsRestoreService(userLimitsRepo, limitsService);
    const result = await service.handleExpiredCycles();
    assert.equal(result.restored, 0);
    assert.equal(result.errors, 1);
  });
});
