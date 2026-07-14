import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { ReputationChangeLogEntity } from '../../entities/reputation-change-log.entity';
import { UserRatingEntity } from '../../entities/user-rating.entity';
import { RatingsService } from './ratings.service';

function createHarness(rows: UserRatingEntity[]) {
  const store = [...rows];
  const logStore: ReputationChangeLogEntity[] = [];

  const ratings = {
    findOne: async ({ where }: { where: { userId: string } }) =>
      store.find((row) => row.userId === where.userId) ?? null,
    create: (data: Partial<UserRatingEntity>) => ({ ...data }) as UserRatingEntity,
    save: async (row: UserRatingEntity) => {
      const index = store.findIndex((item) => item.userId === row.userId);
      if (index >= 0) store[index] = row;
      else store.push(row);
      return row;
    },
  } as unknown as Repository<UserRatingEntity>;

  const logs = {
    find: async ({
      where,
    }: {
      where: { userId: string; metric: string };
    }) =>
      logStore
        .filter((row) => row.userId === where.userId && row.metric === where.metric)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    create: (data: Partial<ReputationChangeLogEntity>) =>
      ({
        ...data,
        createdAt: data.createdAt ?? new Date(),
      }) as ReputationChangeLogEntity,
    save: async (row: ReputationChangeLogEntity) => {
      logStore.push(row);
      return row;
    },
  } as unknown as Repository<ReputationChangeLogEntity>;

  return { service: new RatingsService(ratings, logs), store, logStore };
}

describe('RatingsService', () => {
  it('adjusts karma and rating deltas and writes log', async () => {
    const { service, logStore } = createHarness([
      {
        userId: 'user-1',
        totalRating: '4.00',
        karma: '10.00',
        referralKarma: '0.00',
        referralRating: '0.00',
        verifiedSales: 2,
        pendingSales: 1,
        updatedAt: new Date('2026-01-01'),
      },
    ]);

    const result = await service.adjust('user-1', {
      karmaDelta: 5,
      ratingDelta: 0.5,
      actorId: 'admin-1',
    });
    assert.equal(result.karma, 15);
    assert.equal(result.totalRating, 4.5);
    assert.equal(result.effectiveKarma, 15);
    assert.equal(result.feedbackCoverage, 2 / 3);
    assert.equal(logStore.length, 2);

    const karmaLog = await service.listLog('user-1', { metric: 'karma' });
    assert.equal(karmaLog.data.length, 1);
    assert.equal(karmaLog.data[0]?.delta, 5);
    assert.equal(karmaLog.data[0]?.balanceAfter, 15);
    assert.equal(karmaLog.data[0]?.source, 'ADMIN_ADJUST');
  });
});
