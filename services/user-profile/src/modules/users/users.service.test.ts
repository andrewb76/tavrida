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
      let prefix: string | null = null;
      let usernameEq: string | null = null;
      const api = {
        where: (clause: string) => {
          if (clause.includes('deletedAt')) {
            filtered = filtered.filter((row) => !row.deletedAt);
          }
          return api;
        },
        orderBy: () => api,
        skip: (offset: number) => {
          filtered = filtered.slice(offset);
          return api;
        },
        take: (limit: number) => {
          filtered = filtered.slice(0, limit);
          return api;
        },
        andWhere: (
          clause: string,
          params?: { q?: string; prefix?: string; username?: string },
        ) => {
          if (clause.includes('deletedAt')) {
            filtered = filtered.filter((row) => !row.deletedAt);
            return api;
          }
          if (clause.includes('username IS NOT NULL')) {
            filtered = filtered.filter((row) => row.username != null);
            return api;
          }
          if (clause.includes('isSuspended')) {
            filtered = filtered.filter((row) => !row.isSuspended);
            return api;
          }
          if (clause.includes('isHardLocked')) {
            filtered = filtered.filter((row) => !row.isHardLocked);
            return api;
          }
          if (clause.includes('lower(profile.username) LIKE') && params?.prefix) {
            prefix = params.prefix.replace(/%/g, '').toLowerCase();
            filtered = filtered.filter((row) =>
              (row.username ?? '').toLowerCase().startsWith(prefix!),
            );
            return api;
          }
          if (clause.includes('lower(profile.username) =') && params?.username) {
            usernameEq = params.username.toLowerCase();
            filtered = filtered.filter(
              (row) => (row.username ?? '').toLowerCase() === usernameEq,
            );
            return api;
          }
          if (params?.q) {
            const needle = params.q.replace(/%/g, '').toLowerCase();
            filtered = filtered.filter(
              (row) =>
                row.userId.toLowerCase().includes(needle) ||
                (row.displayName ?? '').toLowerCase().includes(needle) ||
                (row.email ?? '').toLowerCase().includes(needle) ||
                (row.username ?? '').toLowerCase().includes(needle),
            );
          }
          return api;
        },
        getMany: async () => filtered,
        getOne: async () => filtered[0] ?? null,
        getManyAndCount: async () => [filtered, store.length] as const,
      };
      return api;
    },
    findOne: async ({
      where,
      select,
    }: {
      where: { userId: string };
      select?: string[];
    }) => {
      void select;
      return store.find((row) => row.userId === where.userId) ?? null;
    },
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

function profile(partial: Partial<UserProfileEntity> & { userId: string }): UserProfileEntity {
  return {
    displayName: null,
    email: null,
    username: null,
    avatarUrl: null,
    primaryPhone: null,
    isSuspended: false,
    isHardLocked: false,
    hardLockedAt: null,
    hardLockedBy: null,
    deletedAt: null,
    logtoSyncedAt: null,
    inviterId: null,
    invitationAcceptedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...partial,
  } as UserProfileEntity;
}

describe('UsersService', () => {
  it('lists profiles with pagination metadata', async () => {
    const { service } = createHarness([profile({ userId: 'user-a', displayName: 'Alice', email: 'alice@example.com' })]);

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

  it('syncFromLogto upserts identity fields', async () => {
    const { service, store } = createHarness([]);
    const result = await service.syncFromLogto({
      userId: 'logto-1',
      name: 'Bob',
      username: 'bob',
      primaryEmail: 'bob@example.com',
      avatar: 'https://cdn.example/avatar.png',
    });

    assert.equal(result.userId, 'logto-1');
    assert.equal(result.displayName, 'Bob');
    assert.equal(result.username, 'bob');
    assert.equal(result.email, 'bob@example.com');
    assert.equal(result.avatarUrl, 'https://cdn.example/avatar.png');
    assert.equal(store.length, 1);
    assert.ok(store[0]?.logtoSyncedAt);
  });

  it('getPublicProfile returns public fields only', async () => {
    const { service } = createHarness([
      profile({
        userId: 'user-public',
        displayName: 'Alice',
        email: 'secret@example.com',
        username: 'alice',
        avatarUrl: 'https://cdn.example/a.png',
        primaryPhone: '+7999',
        logtoSyncedAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      }),
    ]);

    const result = await service.getPublicProfile('user-public');
    assert.deepEqual(result, {
      userId: 'user-public',
      displayName: 'Alice',
      username: 'alice',
      avatarUrl: 'https://cdn.example/a.png',
      isSuspended: false,
      isHardLocked: false,
      memberSince: '2026-01-01T00:00:00.000Z',
    });
    assert.equal('email' in result, false);
  });

  it('setHardLock toggles platform lock without touching Logto suspension', async () => {
    const { service, store } = createHarness([
      profile({ userId: 'user-a', isSuspended: false }),
    ]);

    const locked = await service.setHardLock({
      userId: 'user-a',
      locked: true,
      actorId: 'admin-1',
    });
    assert.equal(locked.isHardLocked, true);
    assert.equal(locked.hardLockedBy, 'admin-1');
    assert.ok(locked.hardLockedAt);
    assert.equal(store[0]?.isSuspended, false);

    const unlocked = await service.setHardLock({
      userId: 'user-a',
      locked: false,
      actorId: 'admin-1',
    });
    assert.equal(unlocked.isHardLocked, false);
    assert.equal(unlocked.hardLockedAt, null);
    assert.equal(unlocked.hardLockedBy, null);
  });

  it('searchByUsername prefix-matches and hides reserved', async () => {
    const { service } = createHarness([
      profile({ userId: '1', username: 'alice', displayName: 'A' }),
      profile({ userId: '2', username: 'admin', displayName: 'Admin' }),
      profile({ userId: '3', username: 'al', displayName: 'Short' }),
      profile({ userId: '4', username: null, displayName: 'NoHandle' }),
      profile({ userId: '5', username: 'Alex', displayName: 'Alex' }),
    ]);

    const result = await service.searchByUsername({ q: 'al', limit: 10 });
    const names = result.data.map((r) => r.username);
    assert.equal(names.length, 3);
    assert.ok(names.includes('al'));
    assert.ok(names.includes('alice'));
    assert.ok(names.includes('Alex'));
    assert.ok(!names.includes('admin'));
  });

  it('getByUsername is case-insensitive', async () => {
    const { service } = createHarness([
      profile({ userId: '1', username: 'Alice', displayName: 'A' }),
    ]);
    const row = await service.getByUsername('alice');
    assert.equal(row.userId, '1');
    assert.equal(row.username, 'Alice');
  });
});
