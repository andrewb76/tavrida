import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeMessageDeliveryStatus,
  directPairKey,
  directSelfKey,
} from './chat.types';

describe('chat.types', () => {
  it('directPairKey is order-independent', () => {
    assert.equal(directPairKey('b', 'a'), directPairKey('a', 'b'));
  });

  it('directSelfKey is namespaced', () => {
    assert.equal(directSelfKey('u1'), 'self:u1');
  });

  it('computeMessageDeliveryStatus hides ticks for peer messages and self-DM', () => {
    const createdAt = new Date('2026-07-22T12:00:00.000Z');
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'b',
        selfChat: false,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [createdAt],
      }),
      null,
    );
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'a',
        selfChat: true,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [],
      }),
      null,
    );
  });

  it('computeMessageDeliveryStatus DELIVERED vs READ', () => {
    const createdAt = new Date('2026-07-22T12:00:00.000Z');
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'a',
        selfChat: false,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [null],
      }),
      'DELIVERED',
    );
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'a',
        selfChat: false,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [new Date('2026-07-22T11:59:00.000Z')],
      }),
      'DELIVERED',
    );
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'a',
        selfChat: false,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [createdAt],
      }),
      'READ',
    );
    assert.equal(
      computeMessageDeliveryStatus({
        authorId: 'a',
        viewerId: 'a',
        selfChat: false,
        messageCreatedAt: createdAt,
        otherMembersLastReadAt: [createdAt, null],
      }),
      'DELIVERED',
    );
  });
});
