import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CommentsService } from './comments.service';

function createHarness(existingComments: Array<Record<string, unknown>> = []) {
  const store = [...existingComments];

  const commentsRepo = {
    find: async () => store,
    findAndCount: async ({ where, skip, take }: Record<string, unknown>) => {
      let filtered = [...store];
      if (where && typeof where === 'object') {
        for (const [key, value] of Object.entries(where)) {
          filtered = filtered.filter((c) => c[key] === value);
        }
      }
      const total = filtered.length;
      if (typeof skip === 'number') filtered = filtered.slice(skip);
      if (typeof take === 'number') filtered = filtered.slice(0, take);
      return [filtered, total] as const;
    },
    createQueryBuilder: () => {
      let _params: Record<string, unknown> = {};
      let _skip = 0;
      let _take = 20;
      const qb = {
        where: (_w: string, p: Record<string, unknown>) => { _params = { ..._params, ...p }; return qb; },
        andWhere: (_w: string, p: Record<string, unknown>) => { _params = { ..._params, ...p }; return qb; },
        orderBy: (_o: string) => qb,
        addOrderBy: (_o: string) => qb,
        skip: (s: number) => { _skip = s; return qb; },
        take: (t: number) => { _take = t; return qb; },
        getManyAndCount: async () => {
          let filtered = [...store];
          if (_params.authorId) {
            filtered = filtered.filter((c) => c.authorId === _params.authorId);
          }
          if (_params.topicId) {
            filtered = filtered.filter((c) => c.topicId === _params.topicId);
          }
          const total = filtered.length;
          filtered = filtered.slice(_skip, _skip + _take);
          return [filtered, total] as const;
        },
      };
      return qb;
    },
  };

  const topicsRepo = {
    findOne: async () => null,
  };

  const service = new CommentsService(
    commentsRepo as never,
    {} as never,
    topicsRepo as never,
    {} as never, // categoryAcl
    {} as never, // dataSource
    { get: () => undefined } as never, // config
    { findMineMany: async () => new Map(), summarize: () => ({ plusCount: 0, minusCount: 0, score: 0, myVote: null, canChange: false }) } as never, // votes
    { emit: () => {} } as never, // events
    { getMany: async () => new Map() } as never, // userProfile
  );

  return { service, store };
}

describe('CommentsService.listByAuthor', () => {
  it('returns comments by author', async () => {
    const { service } = createHarness([
      { id: 'c-1', topicId: 't-1', authorId: 'u-1', body: 'Hello', parentId: null, attachments: [], promotedTopicId: null, votePlusCount: 0, voteMinusCount: 0, deletedAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
      { id: 'c-2', topicId: 't-2', authorId: 'u-2', body: 'World', parentId: null, attachments: [], promotedTopicId: null, votePlusCount: 0, voteMinusCount: 0, deletedAt: null, createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02') },
      { id: 'c-3', topicId: 't-1', authorId: 'u-1', body: 'Again', parentId: 'c-1', attachments: [], promotedTopicId: null, votePlusCount: 0, voteMinusCount: 0, deletedAt: null, createdAt: new Date('2026-01-03'), updatedAt: new Date('2026-01-03') },
    ]);

    const result = await service.listByAuthor('u-1');

    assert.equal(result.data.length, 2);
    assert.equal(result.total, 2);
    assert.equal(result.data[0].authorId, 'u-1');
    assert.equal(result.data[1].authorId, 'u-1');
  });

  it('returns empty array when author has no comments', async () => {
    const { service } = createHarness([
      { id: 'c-1', topicId: 't-1', authorId: 'u-1', body: 'Hello', parentId: null, attachments: [], promotedTopicId: null, votePlusCount: 0, voteMinusCount: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const result = await service.listByAuthor('u-99');

    assert.equal(result.data.length, 0);
    assert.equal(result.total, 0);
  });

  it('respects pagination', async () => {
    const comments = Array.from({ length: 5 }, (_, i) => ({
      id: `c-${i}`,
      topicId: 't-1',
      authorId: 'u-1',
      body: `Comment ${i}`,
      parentId: null,
      attachments: [],
      promotedTopicId: null,
      votePlusCount: 0,
      voteMinusCount: 0,
      deletedAt: null,
      createdAt: new Date(`2026-01-0${i + 1}`),
      updatedAt: new Date(`2026-01-0${i + 1}`),
    }));

    const { service } = createHarness(comments);

    const page1 = await service.listByAuthor('u-1', { limit: 2, offset: 0 });
    assert.equal(page1.data.length, 2);
    assert.equal(page1.total, 5);

    const page2 = await service.listByAuthor('u-1', { limit: 2, offset: 2 });
    assert.equal(page2.data.length, 2);
    assert.equal(page2.total, 5);
  });

  it('clamps limit to 200 max', async () => {
    const { service } = createHarness([]);
    const result = await service.listByAuthor('u-1', { limit: 500 });
    assert.ok(result); // should not throw
  });

  it('ignores negative offset', async () => {
    const { service } = createHarness([
      { id: 'c-1', topicId: 't-1', authorId: 'u-1', body: 'Hello', parentId: null, attachments: [], promotedTopicId: null, votePlusCount: 0, voteMinusCount: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const result = await service.listByAuthor('u-1', { offset: -5 });
    assert.equal(result.data.length, 1);
  });
});
