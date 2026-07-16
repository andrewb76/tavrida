export type BidAuctionSnapshot = {
  status: string;
  type: string;
  sellerId: string;
  currentPrice: number;
  bidIncrement: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type PlaceBidInput = {
  auction: BidAuctionSnapshot;
  bidderId: string;
  amount: number;
  now?: Date;
};

export type PlaceBidOk = {
  ok: true;
  /** If auction was SCHEDULED and startsAt passed — treat as ACTIVE for this bid */
  activate: boolean;
  /** Dutch accept — close immediately with this bidder as winner */
  completeImmediately: boolean;
};

export type PlaceBidErr = {
  ok: false;
  code:
    | 'not_active'
    | 'ended'
    | 'seller_forbidden'
    | 'amount_too_low'
    | 'amount_mismatch'
    | 'invalid_amount';
  detail: string;
};

export type PlaceBidResult = PlaceBidOk | PlaceBidErr;

function resolveActiveStatus(
  auction: BidAuctionSnapshot,
  now: Date,
): { status: string; activate: boolean } | PlaceBidErr {
  let status = auction.status;
  let activate = false;
  if (
    status === 'SCHEDULED' &&
    auction.startsAt &&
    auction.startsAt.getTime() <= now.getTime()
  ) {
    status = 'ACTIVE';
    activate = true;
  }

  if (status !== 'ACTIVE') {
    return { ok: false, code: 'not_active', detail: `Auction is ${auction.status}` };
  }

  if (auction.endsAt && auction.endsAt.getTime() <= now.getTime()) {
    return { ok: false, code: 'ended', detail: 'Auction has ended' };
  }

  return { status, activate };
}

export function validatePlaceBid(input: PlaceBidInput): PlaceBidResult {
  const now = input.now ?? new Date();
  const { auction, bidderId, amount } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: 'invalid_amount', detail: 'Amount must be a positive number' };
  }

  if (bidderId === auction.sellerId) {
    return { ok: false, code: 'seller_forbidden', detail: 'Seller cannot bid on own auction' };
  }

  const active = resolveActiveStatus(auction, now);
  if ('ok' in active && active.ok === false) return active;

  const { activate } = active as { status: string; activate: boolean };

  if (auction.type === 'DUTCH') {
    if (Math.abs(amount - auction.currentPrice) > 1e-9) {
      return {
        ok: false,
        code: 'amount_mismatch',
        detail: `Dutch accept must equal current ask (${auction.currentPrice})`,
      };
    }
    return { ok: true, activate, completeImmediately: true };
  }

  const minNext = minNextBid(auction.currentPrice, auction.bidIncrement, 'ENGLISH');
  if (amount + 1e-9 < minNext) {
    return {
      ok: false,
      code: 'amount_too_low',
      detail: `Minimum bid is ${minNext}`,
    };
  }

  return { ok: true, activate, completeImmediately: false };
}

export function minNextBid(
  currentPrice: number,
  bidIncrement: number,
  type: string = 'ENGLISH',
): number {
  if (type === 'DUTCH') return currentPrice;
  return currentPrice + bidIncrement;
}

/** Floor for Dutch ask: reserve if set, else one step (at least 1). */
export function dutchAskFloor(reservePrice: number | null, bidIncrement: number): number {
  if (reservePrice != null) return reservePrice;
  return Math.max(1, bidIncrement);
}

export function dropDutchAsk(
  currentPrice: number,
  bidIncrement: number,
  reservePrice: number | null,
): { nextPrice: number; dropped: boolean; atFloor: boolean } {
  const floor = dutchAskFloor(reservePrice, bidIncrement);
  if (currentPrice <= floor + 1e-9) {
    return { nextPrice: currentPrice, dropped: false, atFloor: true };
  }
  const next = Math.max(floor, currentPrice - bidIncrement);
  return {
    nextPrice: next,
    dropped: next < currentPrice - 1e-9,
    atFloor: next <= floor + 1e-9,
  };
}
