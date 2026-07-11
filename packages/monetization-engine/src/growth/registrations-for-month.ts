import type { GrowthModel } from '../types-growth.js';

/** Deterministic registrations count for month t (1-based). */
export function registrationsForMonth(
  model: GrowthModel,
  monthIndex: number,
): number {
  if (monthIndex < 1) return 0;

  switch (model.type) {
    case 'linear':
      return Math.max(0, Math.round(model.registrationsPerMonth));
    case 'exponential': {
      const g = model.monthlyGrowthRatePercent / 100;
      const raw = model.registrationsMonth1 * Math.pow(1 + g, monthIndex - 1);
      return Math.max(0, Math.round(raw));
    }
    case 'logistic_s_curve': {
      const { carryingCapacity: k, inflectionMonth: t0, steepness: steep } = model;
      const prev =
        monthIndex === 1
          ? 0
          : k / (1 + Math.exp(-steep * (monthIndex - 1 - t0)));
      const curr = k / (1 + Math.exp(-steep * (monthIndex - t0)));
      return Math.max(0, Math.round(curr - prev));
    }
    default:
      return 0;
  }
}

export function buildRegistrationsSeries(
  model: GrowthModel,
  periodMonths: number,
): number[] {
  const out: number[] = [];
  for (let m = 1; m <= periodMonths; m++) {
    out.push(registrationsForMonth(model, m));
  }
  return out;
}
