import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isDigestDue,
  resolveMatchQuery,
  TARGET_LIMIT_KEYS,
  TARGET_TYPES,
} from '../common/subscription.types';

describe('subscription limit keys', () => {
  it('maps primary target types to registry keys', () => {
    assert.equal(TARGET_LIMIT_KEYS.AUCTION_CATEGORY, 'subscriptions.member.auction.categoryMax');
    assert.equal(TARGET_LIMIT_KEYS.AUCTION, 'subscriptions.member.auction.lotMax');
    assert.equal(TARGET_LIMIT_KEYS.FORUM_TOPIC, 'subscriptions.member.forum.topicMax');
    assert.equal(TARGET_LIMIT_KEYS.TAG, 'subscriptions.member.tag.max');
  });

  it('covers all target types', () => {
    for (const t of TARGET_TYPES) {
      assert.ok(t in TARGET_LIMIT_KEYS);
    }
  });
});

describe('resolveMatchQuery', () => {
  const categoryId = '11111111-1111-4111-8111-111111111111';
  const auctionId = '22222222-2222-4222-8222-222222222222';
  const topicId = '33333333-3333-4333-8333-333333333333';
  const tagId = '44444444-4444-4444-8444-444444444444';

  it('maps auction.created to category subscription', () => {
    assert.deepEqual(resolveMatchQuery('auction.created', { categoryId, auctionId }), {
      sourceDomain: 'auction',
      targetType: 'AUCTION_CATEGORY',
      targetId: categoryId,
    });
  });

  it('maps auction.bid_placed to lot subscription', () => {
    assert.deepEqual(resolveMatchQuery('auction.bid_placed', { auctionId }), {
      sourceDomain: 'auction',
      targetType: 'AUCTION',
      targetId: auctionId,
    });
  });

  it('maps forum.comment_created to topic subscription', () => {
    assert.deepEqual(resolveMatchQuery('forum.comment_created', { topicId }), {
      sourceDomain: 'forum',
      targetType: 'FORUM_TOPIC',
      targetId: topicId,
    });
  });

  it('maps tag.content_tagged', () => {
    assert.deepEqual(resolveMatchQuery('tag.content_tagged', { tagId }), {
      sourceDomain: 'platform',
      targetType: 'TAG',
      targetId: tagId,
    });
  });

  it('returns null for unknown events or bad ids', () => {
    assert.equal(resolveMatchQuery('billing.charge_completed', {}), null);
    assert.equal(resolveMatchQuery('auction.created', { categoryId: 'nope' }), null);
  });
});

describe('isDigestDue', () => {
  it('daily is always due', () => {
    assert.equal(isDigestDue('DAILY', new Date('2026-07-15T10:00:00Z')), true);
  });

  it('weekly is due on Monday UTC', () => {
    assert.equal(isDigestDue('WEEKLY', new Date('2026-07-13T10:00:00Z')), true); // Monday
    assert.equal(isDigestDue('WEEKLY', new Date('2026-07-14T10:00:00Z')), false); // Tuesday
  });
});
