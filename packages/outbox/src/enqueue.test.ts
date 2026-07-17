import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDomainEvent, retryDelayMs } from './enqueue';

describe('outbox envelope', () => {
  it('preserves an explicit event id across retries', () => {
    const event = createDomainEvent({
      eventId: '687d138e-6ca4-4ef3-bf1a-02eb5857cde3',
      eventType: 'auction.completed',
      producer: 'auction',
      correlationId: 'auction-1',
      timestamp: new Date('2026-07-17T09:00:00.000Z'),
      payload: { auctionId: 'auction-1' },
    });

    assert.equal(event.eventId, '687d138e-6ca4-4ef3-bf1a-02eb5857cde3');
    assert.equal(event.timestamp, '2026-07-17T09:00:00.000Z');
    assert.equal(event.eventVersion, '1');
  });

  it('uses bounded exponential retry delays', () => {
    assert.equal(retryDelayMs(1), 1_000);
    assert.equal(retryDelayMs(2), 2_000);
    assert.equal(retryDelayMs(20), 256_000);
  });
});
