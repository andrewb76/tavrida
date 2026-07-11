import {
  computeMonthlyNet,
  computeVariableCosts,
  findBreakEvenMonth,
  sumFixedCosts,
} from './costs/compute-costs';
import { buildRegistrationsSeries, registrationsForMonth } from './growth/registrations-for-month';
import { computeChargeAmount, computeOneTimeRevenue } from './one-time/compute-one-time';
import { computeReferralOut } from './referral/compute-referral-out';
import { compare, simulate } from './simulate';
import { computeMrr } from './subscriptions/compute-mrr';

/**
 * Static facade — no instances, no state.
 * Prefer named imports in tests; use this in services for discoverability.
 */
export class MonetizationMath {
  private constructor() {
    /* static-only */
  }

  static readonly computeMrr = computeMrr;
  static readonly computeOneTimeRevenue = computeOneTimeRevenue;
  static readonly computeChargeAmount = computeChargeAmount;
  static readonly computeReferralOut = computeReferralOut;
  static readonly sumFixedCosts = sumFixedCosts;
  static readonly computeVariableCosts = computeVariableCosts;
  static readonly computeMonthlyNet = computeMonthlyNet;
  static readonly findBreakEvenMonth = findBreakEvenMonth;
  static readonly registrationsForMonth = registrationsForMonth;
  static readonly buildRegistrationsSeries = buildRegistrationsSeries;
  static readonly simulate = simulate;
  static readonly compare = compare;
}
