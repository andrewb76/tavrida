export type CloseAuctionInput = {
  currentPrice: number;
  reservePrice: number | null;
  winningBidderId: string | null;
};

export type CloseAuctionResult = {
  winnerId: string | null;
  sold: boolean;
  finalPrice: number;
};

/** Reserve null or met → winner = current leader; else unsold. */
export function resolveClose(input: CloseAuctionInput): CloseAuctionResult {
  const { currentPrice, reservePrice, winningBidderId } = input;
  const reserveMet = reservePrice == null || currentPrice + 1e-9 >= reservePrice;
  if (reserveMet && winningBidderId) {
    return { winnerId: winningBidderId, sold: true, finalPrice: currentPrice };
  }
  return { winnerId: null, sold: false, finalPrice: currentPrice };
}
