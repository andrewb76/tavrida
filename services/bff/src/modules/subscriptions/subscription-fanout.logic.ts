export type FanoutResult = {
  notified: number;
  skipped: number;
};

/** Merge match batches and drop excluded actors (pure; unit-tested). */
export function collectMatchedUserIds(
  batches: ReadonlyArray<ReadonlyArray<string>>,
  excludeUserIds: ReadonlyArray<string> = [],
): string[] {
  const exclude = new Set(excludeUserIds);
  const matched = new Set<string>();
  for (const batch of batches) {
    for (const userId of batch) {
      if (!exclude.has(userId)) matched.add(userId);
    }
  }
  return [...matched];
}

/** Public stats only — never expose matched user IDs to API clients. */
export function toFanoutResult(matchedCount: number, notified: number): FanoutResult {
  const skipped = Math.max(0, matchedCount - notified);
  return { notified, skipped };
}
