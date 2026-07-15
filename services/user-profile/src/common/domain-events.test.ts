import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDomainEvent } from './domain-events';

describe('createDomainEvent', () => {
  it('builds invitation.redeemed envelope', () => {
    const env = createDomainEvent({
      eventType: 'invitation.redeemed',
      producer: 'user-profile',
      payload: {
        inviteeId: 'a',
        inviterId: 'b',
        inviteCodeId: 'c',
        acceptedAt: '2026-07-16T00:00:00.000Z',
      },
      eventId: 'evt-1',
      correlationId: 'a',
    });
    assert.equal(env.eventType, 'invitation.redeemed');
    assert.equal(env.producer, 'user-profile');
    assert.equal(env.payload.inviteeId, 'a');
  });
});
