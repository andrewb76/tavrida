import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectMatchedUserIds,
  isInQuietHours,
  shouldSendPush,
  toFanoutResult,
} from './subscription-fanout.logic';

describe('collectMatchedUserIds', () => {
  it('unions batches and dedupes', () => {
    assert.deepEqual(collectMatchedUserIds([['a', 'b'], ['b', 'c']]).sort(), ['a', 'b', 'c']);
  });

  it('excludes actors (e.g. tagger)', () => {
    assert.deepEqual(collectMatchedUserIds([['actor', 'sub']], ['actor']), ['sub']);
  });

  it('handles empty input', () => {
    assert.deepEqual(collectMatchedUserIds([]), []);
    assert.deepEqual(collectMatchedUserIds([[], []]), []);
  });
});

describe('toFanoutResult', () => {
  it('computes skipped from notified', () => {
    assert.deepEqual(toFanoutResult(3, 1), {
      notified: 1,
      skipped: 2,
    });
  });
});

describe('isInQuietHours', () => {
  it('detects overnight window', () => {
    // 23:30 UTC inside 22:00–08:00 UTC
    const night = new Date('2026-07-16T23:30:00.000Z');
    assert.equal(
      isInQuietHours({ start: '22:00', end: '08:00', tz: 'UTC' }, night),
      true,
    );
    const noon = new Date('2026-07-16T12:00:00.000Z');
    assert.equal(
      isInQuietHours({ start: '22:00', end: '08:00', tz: 'UTC' }, noon),
      false,
    );
  });

  it('detects same-day window', () => {
    const mid = new Date('2026-07-16T14:00:00.000Z');
    assert.equal(
      isInQuietHours({ start: '13:00', end: '15:00', tz: 'UTC' }, mid),
      true,
    );
  });
});

describe('shouldSendPush', () => {
  it('respects pushEnabled', () => {
    assert.equal(shouldSendPush({ pushEnabled: false, quietHours: null }), false);
    assert.equal(shouldSendPush({ pushEnabled: true, quietHours: null }), true);
  });
});
