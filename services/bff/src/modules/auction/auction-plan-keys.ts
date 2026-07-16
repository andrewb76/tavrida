export const AUCTION_PLAN_KEYS = {
  dailyCreateMax: 'auction.seller.lot.dailyCreateMax',
  durationMaxHours: 'auction.seller.lot.durationMaxHours',
  promotionEnabled: 'auction.seller.promotion.enabled',
  reserveEnabled: 'auction.seller.reservePrice.enabled',
  promotionUnitPrice: 'auction.seller.promotion.unitPrice',
  reserveUnitPrice: 'auction.seller.reservePrice.unitPrice',
  auctionTypesAllowed: 'auction.bidder.auctionTypes.allowed',
  searchScope: 'auction.member.search.scope',
} as const;
