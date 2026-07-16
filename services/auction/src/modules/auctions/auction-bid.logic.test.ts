import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { minNextBid, validatePlaceBid } from './auction-bid.logic';

const base = {
  status: 'ACTIVE',
  type: 'ENGLISH',
  sellerId: 'seller-1',
  currentPrice: 1000,
  bidIncrement: 100,
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-12-01T00:00:00Z'),
};

describe('validatePlaceBid', () => {
  it('accepts english bid at minNext', () => {
    const r = validatePlaceBid({
      auction: base,
      bidderId: 'bidder-1',
      amount: 1100,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.activate, false);
  });

  it('rejects seller', () => {
    const r = validatePlaceBid({ auction: base, bidderId: 'seller-1', amount: 1100 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'seller_forbidden');
  });

  it('rejects low amount', () => {
    const r = validatePlaceBid({ auction: base, bidderId: 'b', amount: 1099 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'amount_too_low');
  });

  it('rejects dutch', () => {
    const r = validatePlaceBid({
      auction: { ...base, type: 'DUTCH' },
      bidderId: 'b',
      amount: 900,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'dutch_unsupported');
  });

  it('activates scheduled when startsAt passed', () => {
    const r = validatePlaceBid({
      auction: {
        ...base,
        status: 'SCHEDULED',
        startsAt: new Date('2026-01-01T00:00:00Z'),
      },
      bidderId: 'b',
      amount: 1100,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.activate, true);
  });

  it('rejects ended by endsAt', () => {
    const r = validatePlaceBid({
      auction: { ...base, endsAt: new Date('2026-01-02T00:00:00Z') },
      bidderId: 'b',
      amount: 1100,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'ended');
  });
});

describe('minNextBid', () => {
  it('adds increment', () => {
    assert.equal(minNextBid(1000, 100), 1100);
  });
});
