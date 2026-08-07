import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapAuctionEvent } from './auction-ws-relay.consumer';

describe('mapAuctionEvent', () => {
  it('maps bid_placed → bid.placed on auction channel', () => {
    const mapped = mapAuctionEvent({
      eventId: 'e1',
      eventType: 'auction.bid_placed',
      payload: {
        auctionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        bidId: 'bid-1',
        bidderId: 'user-1',
        amount: 1500,
        currency: 'RUB',
        placedAt: '2026-07-28T10:00:00.000Z',
        sellerId: 'seller-1',
      },
    });

    assert.equal(mapped?.channel, 'auction:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.equal(mapped?.event, 'bid.placed');
    assert.equal(mapped?.payload.amount, 1500);
  });

  it('maps completed → auction.ended', () => {
    const mapped = mapAuctionEvent({
      eventId: 'e2',
      eventType: 'auction.completed',
      payload: {
        auctionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        sellerId: 'seller-1',
        buyerId: 'buyer-1',
        finalPrice: 2000,
        currency: 'RUB',
        completedAt: '2026-07-28T12:00:00.000Z',
      },
    });

    assert.equal(mapped?.event, 'auction.ended');
    assert.equal(mapped?.payload.buyerId, 'buyer-1');
  });

  it('returns null without auctionId', () => {
    assert.equal(
      mapAuctionEvent({
        eventId: 'e3',
        eventType: 'auction.bid_placed',
        payload: { amount: 1 },
      }),
      null,
    );
  });
});
