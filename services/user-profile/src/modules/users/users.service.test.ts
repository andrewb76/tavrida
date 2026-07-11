import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Repository } from 'typeorm';

import { UserProfileEntity } from '../../entities/user-profile.entity';
import { UsersService } from './users.service';

function createHarness(rows: UserProfileEntity[]) {
  const store = [...rows];

  const profiles = {
    createQueryBuilder: () => {
      let filtered = [...store];
      const api = {
        orderBy: () => api,
        skip: (offset: number) => {
          filtered = filtered.slice(offset);
          return api;
        },
        take: (limit: number) => {
          filtered = filtered.slice(0, limit);
          return api;
        },
        andWhere: (_clause: string, params: { q: string }) => {
          const needle = params.q.replace(/%/g, '').toLowerCase();
          filtered = filtered.filter(
            (row) =>
              row.userId.toLowerCase().includes(needle) ||
              (row.displayName ?? '').toLowerCase().includes(needle),
          );
          return api;
        },
        getManyAndCount: async () => [filtered, store.length] as const,
      };
      return api;
    },
    findOne: async ({ where }: { where: { userId: string } }) =>
      store.find((row) => row.userId === where.userId) ?? null,
    create: (data: Partial<UserProfileEntity>) => ({ ...data }) as UserProfileEntity,
    save: async (row: UserProfileEntity) => {
      const now = new Date('2026-01-02');
      if (!row.createdAt) row.createdAt = now;
      if (!row.updatedAt) row.updatedAt = now;
      const index = store.findIndex((item) => item.userId === row.userId);
      if (index >= 0) store[index] = row;
      else store.push(row);
      return row;
    },
  } as unknown as Repository<UserProfileEntity>;

  return { service: new UsersService(profiles), store };
}

describe('UsersService', () => {
  it('lists profiles with pagination metadata', async () => {
    const { service } = createHarness([
      {
        userId: 'user-a',
        displayName: 'Alice',
        inviterId: null,
        invitationAcceptedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      } as UserProfileEntity,
    ]);

    const result = await service.list({ offset: 0, limit: 10 });
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.userId, 'user-a');
    assert.equal(result.pagination.total, 1);
  });

  it('ensure creates missing profile', async () => {
    const { service, store } = createHarness([]);
    const result = await service.ensure('new-user');
    assert.equal(result.userId, 'new-user');
    assert.equal(store.length, 1);
  });
});
