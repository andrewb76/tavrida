import type { ValueTransformer } from 'typeorm';

/**
 * Canonical period date (API / entity representation):
 *   CE:  "0476-01-01"
 *   BCE: "-0500-01-01"  (= 500 BCE, ISO-8601 astronomical numbering)
 */
export const PERIOD_DATE_RE = /^-?\d{4}-\d{2}-\d{2}$/;

// A value is only accepted when the date is at the end of the string or is
// followed by an ISO time part; "0500-01-01 BC" (PostgreSQL form) is rejected.
const PERIOD_DATE_PREFIX_RE = /^(-?)(\d{4}-\d{2}-\d{2})(?=$|T|\s\d)/;

/**
 * Accepts a bare date or a date with a trailing time part
 * ("2024-01-15T00:00:00Z" → "2024-01-15", "-0500-01-01T00:00:00Z" → "-0500-01-01").
 * Returns null when the value is not a valid period date.
 */
export function normalizePeriodDate(value: string): string | null {
  const match = PERIOD_DATE_PREFIX_RE.exec(value.trim());
  if (!match) return null;
  const normalized = `${match[1]}${match[2]}`;
  return PERIOD_DATE_RE.test(normalized) ? normalized : null;
}

/**
 * PostgreSQL `date` has no ISO-8601 negative years: BCE dates are written
 * as "0500-01-01 BC". CE dates pass through unchanged.
 */
export function toDbDate(value: string): string {
  return value.startsWith('-') ? `${value.slice(1)} BC` : value;
}

export function fromDbDate(value: string): string {
  return value.endsWith(' BC') ? `-${value.slice(0, 10)}` : value;
}

export const periodDateTransformer: ValueTransformer = {
  to: (value: string | null | undefined) =>
    value === null || value === undefined ? value : toDbDate(value),
  from: (value: string | null | undefined) =>
    value === null || value === undefined ? value : fromDbDate(value),
};
