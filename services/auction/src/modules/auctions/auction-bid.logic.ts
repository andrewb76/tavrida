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
};

export type PlaceBidErr = {
  ok: false;
  code:
    | 'not_active'
    | 'ended'
    | 'seller_forbidden'
    | 'amount_too_low'
    | 'dutch_unsupported'
    | 'invalid_amount';
  detail: string;
};

export type PlaceBidResult = PlaceBidOk | PlaceBidErr;

export function validatePlaceBid(input: PlaceBidInput): PlaceBidResult {
  const now = input.now ?? new Date();
  const { auction, bidderId, amount } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: 'invalid_amount', detail: 'Amount must be a positive number' };
  }

  if (bidderId === auction.sellerId) {
    return { ok: false, code: 'seller_forbidden', detail: 'Seller cannot bid on own auction' };
  }

  if (auction.type === 'DUTCH') {
    return {
      ok: false,
      code: 'dutch_unsupported',
      detail: 'Dutch auction bidding is not implemented yet',
    };
  }

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

  const minNext = auction.currentPrice + auction.bidIncrement;
  if (amount + 1e-9 < minNext) {
    return {
      ok: false,
      code: 'amount_too_low',
      detail: `Minimum bid is ${minNext}`,
    };
  }

  return { ok: true, activate };
}

export function minNextBid(currentPrice: number, bidIncrement: number): number {
  return currentPrice + bidIncrement;
}
