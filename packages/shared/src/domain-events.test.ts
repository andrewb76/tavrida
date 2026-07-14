import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDomainEvent,
  dealFeedbackRatingDelta,
  DOMAIN_EVENTS_EXCHANGE,
} from './domain-events.js';

describe('domain-events', () => {
  it('createDomainEvent fills envelope v1', () => {
    const evt = createDomainEvent({
      eventType: 'marketplace.order_completed',
      producer: 'marketplace',
      payload: { orderId: 'o1' },
      eventId: 'fixed-id',
    });
    assert.equal(evt.eventId, 'fixed-id');
    assert.equal(evt.eventVersion, '1');
    assert.equal(evt.eventType, 'marketplace.order_completed');
    assert.equal(DOMAIN_EVENTS_EXCHANGE, 'tavrida-lot.events');
  });

  it('dealFeedbackRatingDelta maps stars', () => {
    assert.equal(dealFeedbackRatingDelta(1), -2);
    assert.equal(dealFeedbackRatingDelta(3), 0);
    assert.equal(dealFeedbackRatingDelta(5), 2);
    assert.throws(() => dealFeedbackRatingDelta(0));
  });
});
