export type SubscriptionRow = {
  id: string;
  userId: string;
  sourceDomain: string;
  targetType: string;
  targetId: string | null;
  options: Record<string, unknown>;
  createdAt: string;
};

export type TargetMeta = {
  title: string | null;
  slug: string | null;
};

export type EnrichedSubscription = SubscriptionRow & {
  targetTitle: string | null;
  targetSlug: string | null;
};

/** Collect unique targetIds per enrichable type (pure). */
export function collectEnrichmentIds(rows: ReadonlyArray<SubscriptionRow>): {
  topicIds: string[];
  tagIds: string[];
  auctionIds: string[];
} {
  const topics = new Set<string>();
  const tags = new Set<string>();
  const auctions = new Set<string>();
  for (const row of rows) {
    if (!row.targetId) continue;
    if (row.targetType === 'FORUM_TOPIC') topics.add(row.targetId);
    else if (row.targetType === 'TAG') tags.add(row.targetId);
    else if (row.targetType === 'AUCTION') auctions.add(row.targetId);
  }
  return {
    topicIds: [...topics],
    tagIds: [...tags],
    auctionIds: [...auctions],
  };
}

export function enrichSubscriptionRows(
  rows: ReadonlyArray<SubscriptionRow>,
  metaByKey: ReadonlyMap<string, TargetMeta>,
): EnrichedSubscription[] {
  return rows.map((row) => {
    const key = row.targetId ? `${row.targetType}:${row.targetId}` : null;
    const meta = key ? metaByKey.get(key) : undefined;
    return {
      ...row,
      targetTitle: meta?.title ?? null,
      targetSlug: meta?.slug ?? null,
    };
  });
}

export function metaKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}
