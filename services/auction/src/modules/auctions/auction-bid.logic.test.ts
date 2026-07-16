import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dropDutchAsk,
  dutchAskFloor,
  minNextBid,
  validatePlaceBid,
} from './auction-bid.logic';

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
    if (r.ok) {
      assert.equal(r.activate, false);
      assert.equal(r.completeImmediately, false);
    }
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

  it('accepts dutch at current ask and completes immediately', () => {
    const r = validatePlaceBid({
      auction: { ...base, type: 'DUTCH' },
      bidderId: 'b',
      amount: 1000,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.completeImmediately, true);
  });

  it('rejects dutch amount mismatch', () => {
    const r = validatePlaceBid({
      auction: { ...base, type: 'DUTCH' },
      bidderId: 'b',
      amount: 900,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'amount_mismatch');
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
  it('adds increment for english', () => {
    assert.equal(minNextBid(1000, 100, 'ENGLISH'), 1100);
  });

  it('equals ask for dutch', () => {
    assert.equal(minNextBid(1000, 100, 'DUTCH'), 1000);
  });
});

describe('dropDutchAsk', () => {
  it('drops by increment until reserve floor', () => {
    const a = dropDutchAsk(1000, 100, 850);
    assert.deepEqual(a, { nextPrice: 900, dropped: true, atFloor: false });
    const b = dropDutchAsk(900, 100, 850);
    assert.deepEqual(b, { nextPrice: 850, dropped: true, atFloor: true });
    const c = dropDutchAsk(850, 100, 850);
    assert.deepEqual(c, { nextPrice: 850, dropped: false, atFloor: true });
  });

  it('uses bidIncrement as floor when no reserve', () => {
    assert.equal(dutchAskFloor(null, 50), 50);
    const r = dropDutchAsk(120, 50, null);
    assert.deepEqual(r, { nextPrice: 70, dropped: true, atFloor: false });
  });
});
