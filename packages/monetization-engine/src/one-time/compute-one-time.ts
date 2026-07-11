import { roundRub } from '../money';
import type { ActivitySnapshot, OneTimePriceMap } from '../types';

/**
 * Sum of enabled one-time charge targets for a month.
 */
export function computeOneTimeRevenue(
  activity: ActivitySnapshot,
  prices: OneTimePriceMap,
): number {
  let total = 0;

  const bump = (target: string, events: number) => {
    const row = prices[target];
    if (row?.enabled && events > 0) total += events * row.amountRub;
  };

  bump('auction.promotion', activity.promotionEvents);
  bump('auction.reservePrice', activity.reserveEvents);
  bump('auction.customDurationPreset', activity.customPresetEvents);

  for (const [target, events] of Object.entries(activity.forumReactionEvents)) {
    bump(target, events);
  }

  return roundRub(total);
}

/** Amount for a single billing.charge — same formula Oracle uses per event. */
export function computeChargeAmount(target: string, prices: OneTimePriceMap): number {
  const row = prices[target];
  if (!row?.enabled) return 0;
  return roundRub(row.amountRub);
}
