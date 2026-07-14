/**
 * Sibling partition invariants for historical periods.
 * Children sorted by sortIndex must cover the parent without gaps/overlaps.
 */

export type DateLike = string; // ISO date YYYY-MM-DD (BC: -YYYY-MM-DD or PostgreSQL style)

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

function cmpDate(a: DateLike, b: DateLike): number {
  // ISO-8601 dates (incl. negative years) compare lexicographically if zero-padded.
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

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
