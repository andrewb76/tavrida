import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterEligibleUserIds, isInQuietHours, shouldSendPush } from './delivery-filter';

describe('delivery-filter', () => {
  it('respects pushEnabled and quiet hours', () => {
    assert.equal(shouldSendPush({ pushEnabled: false, quietHours: null }), false);
    assert.equal(shouldSendPush({ pushEnabled: true, quietHours: null }), true);

    const noonUtc = new Date('2026-07-16T12:00:00.000Z');
    assert.equal(
      isInQuietHours({ start: '22:00', end: '08:00', tz: 'UTC' }, noonUtc),
      false,
    );
    assert.equal(
      shouldSendPush({
        pushEnabled: true,
        quietHours: { start: '10:00', end: '14:00', tz: 'UTC' },
        now: noonUtc,
      }),
      false,
    );
  });

  it('filters matched users with exclude and prefs', () => {
    const prefs = new Map([
      ['u1', { pushEnabled: true, quietHours: null }],
      ['u2', { pushEnabled: false, quietHours: null }],
    ]);
    assert.deepEqual(
      filterEligibleUserIds({
        matchedUserIds: ['u1', 'u2', 'u3', 'actor'],
        excludeUserIds: ['actor'],
        prefsByUserId: prefs,
      }),
      ['u1', 'u3'],
    );
  });
});
