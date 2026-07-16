import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveClose } from './auction-close.logic';

describe('resolveClose', () => {
  it('sets winner when no reserve', () => {
    const r = resolveClose({
      currentPrice: 1500,
      reservePrice: null,
      winningBidderId: 'b1',
    });
    assert.deepEqual(r, { winnerId: 'b1', sold: true, finalPrice: 1500 });
  });

  it('sets winner when reserve met', () => {
    const r = resolveClose({
      currentPrice: 2000,
      reservePrice: 1800,
      winningBidderId: 'b1',
    });
    assert.equal(r.sold, true);
    assert.equal(r.winnerId, 'b1');
  });

  it('unsold when reserve not met', () => {
    const r = resolveClose({
      currentPrice: 1000,
      reservePrice: 2000,
      winningBidderId: 'b1',
    });
    assert.deepEqual(r, { winnerId: null, sold: false, finalPrice: 1000 });
  });

  it('unsold when no bids', () => {
    const r = resolveClose({
      currentPrice: 500,
      reservePrice: null,
      winningBidderId: null,
    });
    assert.equal(r.sold, false);
    assert.equal(r.winnerId, null);
  });
});
