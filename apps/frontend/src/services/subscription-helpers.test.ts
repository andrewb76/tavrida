import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findSubscription,
  sourceDomainLabel,
  subscriptionHref,
  targetTypeLabel,
  type EventSubscription,
} from './subscription-helpers.js';

function row(
  partial: Partial<EventSubscription> & Pick<EventSubscription, 'id' | 'targetType'>,
): EventSubscription {
  return {
    userId: 'user-1',
    sourceDomain: 'forum',
    targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    options: {},
    createdAt: '2026-07-15T10:00:00.000Z',
    ...partial,
  };
}

describe('subscription-helpers', () => {
  it('labels target types and domains in Russian', () => {
    assert.equal(targetTypeLabel('FORUM_TOPIC'), 'Тема форума');
    assert.equal(targetTypeLabel('TAG'), 'Тег');
    assert.equal(sourceDomainLabel('platform'), 'Платформа');
    assert.equal(sourceDomainLabel('auction'), 'Аукцион');
  });

  it('builds deep links for topic and auction only', () => {
    assert.equal(
      subscriptionHref(row({ id: '1', targetType: 'FORUM_TOPIC', targetId: 'topic-1' })),
      '/forum/topics/topic-1',
    );
    assert.equal(
      subscriptionHref(row({ id: '2', targetType: 'AUCTION', targetId: 'lot-1', sourceDomain: 'auction' })),
      '/auctions/lot-1',
    );
    assert.equal(
      subscriptionHref(row({ id: '3', targetType: 'TAG', targetId: 'tag-1', sourceDomain: 'platform' })),
      null,
    );
    assert.equal(subscriptionHref(row({ id: '4', targetType: 'DIGEST_GLOBAL', targetId: null })), null);
  });

  it('finds subscription by target type and id', () => {
    const rows = [
      row({ id: 'a', targetType: 'TAG', targetId: 't1', sourceDomain: 'platform' }),
      row({ id: 'b', targetType: 'FORUM_TOPIC', targetId: 'topic-1' }),
    ];
    assert.equal(findSubscription(rows, 'FORUM_TOPIC', 'topic-1')?.id, 'b');
    assert.equal(findSubscription(rows, 'TAG', 'missing'), undefined);
  });
});
