/**
 * Numeric-prefix draft keys (2026-07) → canonical semantic keys.
 * @see docs/13-maintenance/registry-keys.md
 */
export const LEGACY_PLAN_VARIABLE_KEY_ALIASES: Readonly<Record<string, string>> = {
  'auction.bidder.01participation.activeMax': 'auction.bidder.participation.activeMax',
  'auction.seller.01lot.activeMax': 'auction.seller.lot.activeMax',
  'auction.seller.02lot.dailyCreateMax': 'auction.seller.lot.dailyCreateMax',
  'auction.seller.04promotion.enabled': 'auction.seller.promotion.enabled',
  'auction.seller.08promotion.unitPrice': 'auction.seller.promotion.unitPrice',
  'auction.seller.09reservePrice.unitPrice': 'auction.seller.reservePrice.unitPrice',
  'club.member.01invite.monthlyMax': 'club.member.invite.monthlyMax',
  'referralRewards.member.01earn.monthlyMax': 'referralRewards.earning.monthlyMax',
  'referralRewards.program.01payout.enabled': 'referralRewards.program.enabled',
};
