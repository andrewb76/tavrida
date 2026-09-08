import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { TopicEntity } from '../../entities/topic.entity';
import { TopicsService } from './topics.service';

function topic(overrides: Partial<TopicEntity> = {}): TopicEntity {
  return {
    id: 't-1',
    categoryId: 'cat-1',
    authorId: 'u-1',
    title: 'Test topic',
    body: 'Body',
    status: 'PUBLISHED',
    publishedAt: new Date('2026-01-01'),
    isPinned: false,
    votePlusCount: 0,
    voteMinusCount: 0,
    tags: [],
    commentCount: 0,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as TopicEntity;
}

function createHarness(existingTopics: TopicEntity[] = []) {
  const store = [...existingTopics];
  const topicsRepo = {
    find: async () => store,
    findOne: async ({ where }: { where: { id?: string; categoryId?: string } }) => {
      if (where.id) return store.find((t) => t.id === where.id) ?? null;
      if (where.categoryId) return store.find((t) => t.categoryId === where.categoryId) ?? null;
      return null;
    },
    create: (data: Partial<TopicEntity>) => ({ ...data }) as TopicEntity,
    save: async (row: TopicEntity) => {
      const i = store.findIndex((t) => t.id === row.id);
      if (i >= 0) store[i] = row; else store.push(row);
      return row;
    },
  } as unknown as Repository<TopicEntity>;

  const dataSource = {
    query: async () => [] as unknown[],
    createQueryBuilder: () => ({
      from: () => ({ innerJoinAndSelect: () => ({ leftJoinAndSelect: () => ({ getMany: async () => [] }) }) }),
    }),
  } as unknown as DataSource;

  const votes = { findMine: async () => null, summarize: () => ({ myVote: 0 }) };
  const tags = {
    listForContent: async () => [],
    replaceTopicTags: async () => ({ tagItems: [], slugs: [], addedTagIds: [] }),
  };
  const userProfile = {
    adjustCounts: async () => {},
    getMany: async () => new Map(),
  };

  const service = new TopicsService(
    topicsRepo as never,
    {} as never, // categories repo
    {} as never, // categoryAcl
    dataSource as never,
    { get: () => undefined } as never,
    votes as never,
    tags as never,
    { emit: () => {} } as never,
    userProfile as never,
  );

  return { service, store, topicsRepo };
}

describe('TopicsService.togglePinned', () => {
  it('pins an unpinned topic when asModerator=true', async () => {
    const { service, store } = createHarness([topic({ id: 't-1', isPinned: false })]);

    const result = await service.togglePinned({ topicId: 't-1', asModerator: true });

    assert.equal(result.isPinned, true);
    assert.equal(store[0].isPinned, true);
  });

  it('unpins a pinned topic when asModerator=true', async () => {
    const { service, store } = createHarness([topic({ id: 't-1', isPinned: true })]);

    const result = await service.togglePinned({ topicId: 't-1', asModerator: true });

    assert.equal(result.isPinned, false);
    assert.equal(store[0].isPinned, false);
  });

  it('throws when asModerator is false or missing', async () => {
    const { service } = createHarness([topic({ id: 't-1' })]);

    await assert.rejects(
      () => service.togglePinned({ topicId: 't-1', asModerator: false }),
      BadRequestException,
    );
    await assert.rejects(
      () => service.togglePinned({ topicId: 't-1' }),
      BadRequestException,
    );
  });

  it('throws when topic not found', async () => {
    const { service } = createHarness([]);

    await assert.rejects(
      () => service.togglePinned({ topicId: 'missing', asModerator: true }),
      NotFoundException,
    );
  });

  it('throws when topic is soft-deleted', async () => {
    const { service } = createHarness([topic({ id: 't-1', deletedAt: new Date() })]);

    await assert.rejects(
      () => service.togglePinned({ topicId: 't-1', asModerator: true }),
      NotFoundException,
    );
  });
});

describe('TopicsService.toSummary', () => {
  it('returns commentCount', () => {
    const { service } = createHarness([]);
    const row = topic({ commentCount: 42 });
    const summary = (service as unknown as { toSummary: (r: TopicEntity) => Record<string, unknown> }).toSummary(row);
    assert.equal(summary.commentCount, 42);
  });

  it('defaults commentCount to 0', () => {
    const { service } = createHarness([]);
    const row = topic({ commentCount: undefined });
    const summary = (service as unknown as { toSummary: (r: TopicEntity) => Record<string, unknown> }).toSummary(row);
    assert.equal(summary.commentCount, 0);
  });
});
