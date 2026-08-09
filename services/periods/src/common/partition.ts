/**
 * Sibling partition invariants for historical periods.
 * Children sorted by sortIndex must cover the parent without gaps/overlaps.
 *
 * Date format: ISO-8601 extended with astronomical year numbering.
 *   CE:  "0476-01-01"    (= 476 AD)
 *   BCE: "-0001-01-01"   (= 1 BC)
 *         "-0476-01-01"   (= 476 BC)
 *   Year 0 does not exist: -0001 = 1 BCE, -0002 = 2 BCE.
 *
 * PostgreSQL `date` type accepts both formats natively.
 * Lexicographic comparison is NOT reliable for mixed CE/BCE — use parseDateDays().
 */

export type DateLike = string;

export type PeriodBounds = {
  startsOn: DateLike;
  endsOn: DateLike;
};

export type PartitionViolation = {
  code:
    | 'EMPTY_OK'
    | 'CHILD_ORDER'
    | 'FIRST_START'
    | 'LAST_END'
    | 'ADJACENT_GAP_OR_OVERLAP'
    | 'CHILD_INVERTED'
    | 'CHILD_OUTSIDE_PARENT';
  message: string;
  index?: number;
};

/**
 * Parse ISO date string to serial day number for reliable comparison.
 * "-0001-01-01" (1 BCE) → -366,  "0000-12-31" invalid,  "0001-01-01" (1 CE) → 1.
 * Uses proleptic Gregorian calendar (same as PostgreSQL).
 */
export function parseDateDays(s: string): number {
  const neg = s.startsWith('-');
  const clean = neg ? s.slice(1) : s;
  const parts = clean.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  // Astronomical year → historical: -0001 = 1 BCE, -0002 = 2 BCE
  const historicalYear = neg ? -(year - 1) : year;

  // Proleptic Gregorian: compute days from 0001-01-01 (1 CE)
  const y = historicalYear;
  const m = month;
  const d = day;

  // Days in prior years
  const priorYears = y - 1;
  const leapDays = Math.floor(priorYears / 4) - Math.floor(priorYears / 100) + Math.floor(priorYears / 400);
  const yearDays = priorYears * 365 + leapDays;

  // Days in prior months of current year (monthDays[i] = day-of-year for first day of month i+1)
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const isLeap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  let doy = (monthDays[m - 1] ?? 0) + d;
  if (isLeap && m > 2) doy += 1;

  return yearDays + doy;
}

function cmpDate(a: DateLike, b: DateLike): number {
  const da = parseDateDays(a);
  const db = parseDateDays(b);
  return da < db ? -1 : da > db ? 1 : 0;
}

export { cmpDate };

export function assertPeriodBounds(p: PeriodBounds): PartitionViolation | null {
  if (cmpDate(p.startsOn, p.endsOn) > 0) {
    return {
      code: 'CHILD_INVERTED',
      message: `startsOn (${p.startsOn}) must be ≤ endsOn (${p.endsOn})`,
    };
  }
  return null;
}

/**
 * Validate that `children` (already sorted by sortIndex) partition `parent`.
 * Empty children list is valid (leaf).
 */
export function validateSiblingPartition(
  parent: PeriodBounds,
  children: PeriodBounds[],
): PartitionViolation | null {
  const parentBad = assertPeriodBounds(parent);
  if (parentBad) return parentBad;

  if (children.length === 0) {
    return null;
  }

  for (let i = 0; i < children.length; i++) {
    const c = children[i]!;
    const bad = assertPeriodBounds(c);
    if (bad) return { ...bad, index: i };

    if (cmpDate(c.startsOn, parent.startsOn) < 0 || cmpDate(c.endsOn, parent.endsOn) > 0) {
      return {
        code: 'CHILD_OUTSIDE_PARENT',
        message: `Child[${i}] [${c.startsOn}..${c.endsOn}] outside parent [${parent.startsOn}..${parent.endsOn}]`,
        index: i,
      };
    }
  }

  if (cmpDate(children[0]!.startsOn, parent.startsOn) !== 0) {
    return {
      code: 'FIRST_START',
      message: `First child must start at parent start (${parent.startsOn}), got ${children[0]!.startsOn}`,
      index: 0,
    };
  }

  const last = children[children.length - 1]!;
  if (cmpDate(last.endsOn, parent.endsOn) !== 0) {
    return {
      code: 'LAST_END',
      message: `Last child must end at parent end (${parent.endsOn}), got ${last.endsOn}`,
      index: children.length - 1,
    };
  }

  for (let i = 0; i < children.length - 1; i++) {
    const left = children[i]!;
    const right = children[i + 1]!;
    if (cmpDate(left.endsOn, right.startsOn) !== 0) {
      return {
        code: 'ADJACENT_GAP_OR_OVERLAP',
        message: `Child[${i}].endsOn (${left.endsOn}) must equal Child[${i + 1}].startsOn (${right.startsOn})`,
        index: i,
      };
    }
  }

  return null;
}
