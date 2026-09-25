/**
 * Period dates are ISO-8601 with astronomical year numbering:
 *   CE:  "0476-01-01"    (10 chars)
 *   BCE: "-0500-01-01"   (11 chars, = 500 BCE)
 *
 * A fixed `slice(0, 10)` would chop BCE dates down to "-0500-01-0".
 * Only a trailing time part may be dropped.
 */
export function periodDateOnly(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  return str.startsWith('-') ? str.slice(0, 11) : str.slice(0, 10);
}
