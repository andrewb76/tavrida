export type SourceDomain = 'auction' | 'forum' | 'marketplace' | 'platform';

export type TargetType =
  | 'AUCTION_CATEGORY'
  | 'AUCTION'
  | 'FORUM_CATEGORY'
  | 'FORUM_TOPIC'
  | 'TAG'
  | 'MARKETPLACE_CATEGORY'
  | 'DIGEST_GLOBAL';

export type EventSubscription = {
  id: string;
  userId: string;
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId: string | null;
  options: Record<string, unknown>;
  createdAt: string;
};

const TARGET_LABELS: Record<TargetType, string> = {
  AUCTION_CATEGORY: 'Категория аукциона',
  AUCTION: 'Лот',
  FORUM_CATEGORY: 'Категория форума',
  FORUM_TOPIC: 'Тема форума',
  TAG: 'Тег',
  MARKETPLACE_CATEGORY: 'Категория маркета',
  DIGEST_GLOBAL: 'Дайджест',
};

const DOMAIN_LABELS: Record<SourceDomain, string> = {
  auction: 'Аукцион',
  forum: 'Форум',
  marketplace: 'Маркет',
  platform: 'Платформа',
};

export function targetTypeLabel(type: TargetType): string {
  return TARGET_LABELS[type] ?? type;
}

export function sourceDomainLabel(domain: SourceDomain): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

/** Deep-link when we know the target route shape. */
export function subscriptionHref(row: EventSubscription): string | null {
  if (!row.targetId) return null;
  switch (row.targetType) {
    case 'FORUM_TOPIC':
      return `/forum/topics/${row.targetId}`;
    case 'AUCTION':
      return `/auctions/${row.targetId}`;
    default:
      return null;
  }
}

export function findSubscription(
  rows: EventSubscription[],
  targetType: TargetType,
  targetId: string,
): EventSubscription | undefined {
  return rows.find((row) => row.targetType === targetType && row.targetId === targetId);
}
