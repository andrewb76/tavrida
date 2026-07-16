import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapEnumToSearchScope,
  parseAuctionTypes,
  parseDurationMaxHours,
} from './auction-plan-policy.logic';

describe('auction-plan-policy.logic', () => {
  it('parseAuctionTypes maps all to both types', () => {
    assert.deepEqual(parseAuctionTypes({ planId: 'pro', found: true, enumValues: ['all'] }, 'pro'), [
      'ENGLISH',
      'DUTCH',
    ]);
  });

  it('parseDurationMaxHours treats -1 as unlimited', () => {
    assert.equal(parseDurationMaxHours(-1, 'pro'), null);
  });

  it('mapEnumToSearchScope maps FILTERS to full scope', () => {
    assert.equal(mapEnumToSearchScope(['FULL_TEXT', 'FILTERS'], 'pro'), 'FULL_TEXT,FILTERS');
  });
});
