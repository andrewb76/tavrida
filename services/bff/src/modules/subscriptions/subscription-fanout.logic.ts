export type FanoutResult = {
  matchedUserIds: string[];
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

export function toFanoutResult(matchedUserIds: string[], notified: number): FanoutResult {
  const skipped = Math.max(0, matchedUserIds.length - notified);
  return { matchedUserIds, notified, skipped };
}
