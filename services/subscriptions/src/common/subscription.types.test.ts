import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TARGET_LIMIT_KEYS, TARGET_TYPES } from '../common/subscription.types';

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
