import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectMatchedUserIds, toFanoutResult } from './subscription-fanout.logic';

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
    assert.deepEqual(toFanoutResult(['u1', 'u2', 'u3'], 1), {
      matchedUserIds: ['u1', 'u2', 'u3'],
      notified: 1,
      skipped: 2,
    });
  });
});
