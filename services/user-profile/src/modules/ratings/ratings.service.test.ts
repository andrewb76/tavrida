import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { UserRatingEntity } from '../../entities/user-rating.entity';
import { RatingsService } from './ratings.service';

function createHarness(rows: UserRatingEntity[]) {
  const store = [...rows];
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

  return { service: new RatingsService(ratings), store };
}

describe('RatingsService', () => {
  it('adjusts karma and rating deltas', async () => {
    const { service } = createHarness([
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

    const result = await service.adjust('user-1', { karmaDelta: 5, ratingDelta: 0.5 });
    assert.equal(result.karma, 15);
    assert.equal(result.totalRating, 4.5);
    assert.equal(result.effectiveKarma, 15);
    assert.equal(result.feedbackCoverage, 2 / 3);
  });
});
