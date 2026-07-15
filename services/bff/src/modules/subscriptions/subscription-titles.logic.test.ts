import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectEnrichmentIds,
  enrichSubscriptionRows,
  metaKey,
  type SubscriptionRow,
} from './subscription-titles.logic';

function row(partial: Partial<SubscriptionRow> & Pick<SubscriptionRow, 'id' | 'targetType'>): SubscriptionRow {
  return {
    userId: 'u1',
    sourceDomain: 'forum',
    targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    options: {},
    createdAt: '2026-07-16T00:00:00.000Z',
    ...partial,
  };
}

describe('subscription-titles.logic', () => {
  it('collects distinct ids by type', () => {
    const ids = collectEnrichmentIds([
      row({ id: '1', targetType: 'FORUM_TOPIC', targetId: 't1' }),
      row({ id: '2', targetType: 'FORUM_TOPIC', targetId: 't1' }),
      row({ id: '3', targetType: 'TAG', targetId: 'tag-1', sourceDomain: 'platform' }),
      row({ id: '4', targetType: 'AUCTION', targetId: 'lot-1', sourceDomain: 'auction' }),
      row({ id: '5', targetType: 'DIGEST_GLOBAL', targetId: null, sourceDomain: 'platform' }),
    ]);
    assert.deepEqual(ids, {
      topicIds: ['t1'],
      tagIds: ['tag-1'],
      auctionIds: ['lot-1'],
    });
  });

  it('applies titles and slugs from meta map', () => {
    const meta = new Map([
      [metaKey('FORUM_TOPIC', 't1'), { title: 'Тема про скифов', slug: null }],
      [metaKey('TAG', 'tag-1'), { title: 'Крым', slug: 'krym' }],
    ]);
    const enriched = enrichSubscriptionRows(
      [
        row({ id: '1', targetType: 'FORUM_TOPIC', targetId: 't1' }),
        row({ id: '2', targetType: 'TAG', targetId: 'tag-1', sourceDomain: 'platform' }),
        row({ id: '3', targetType: 'AUCTION', targetId: 'missing', sourceDomain: 'auction' }),
      ],
      meta,
    );
    assert.equal(enriched[0]?.targetTitle, 'Тема про скифов');
    assert.equal(enriched[1]?.targetTitle, 'Крым');
    assert.equal(enriched[1]?.targetSlug, 'krym');
    assert.equal(enriched[2]?.targetTitle, null);
  });
});
