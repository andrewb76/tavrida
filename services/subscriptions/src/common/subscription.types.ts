export type SourceDomain = 'auction' | 'forum' | 'marketplace' | 'platform';

export type TargetType =
  | 'AUCTION_CATEGORY'
  | 'AUCTION'
  | 'FORUM_CATEGORY'
  | 'FORUM_TOPIC'
  | 'TAG'
  | 'MARKETPLACE_CATEGORY'
  | 'DIGEST_GLOBAL';

export type DigestFrequency = 'DAILY' | 'WEEKLY';

export type QuietHours = {
  start: string;
  end: string;
  tz: string;
};

/** Registry keys from PLATFORM-REGISTRY.md */
export const TARGET_LIMIT_KEYS: Record<TargetType, string | null> = {
  AUCTION_CATEGORY: 'subscriptions.member.auction.categoryMax',
  AUCTION: 'subscriptions.member.auction.lotMax',
  FORUM_CATEGORY: 'subscriptions.member.forum.categoryMax',
  FORUM_TOPIC: 'subscriptions.member.forum.topicMax',
  TAG: 'subscriptions.member.tag.max',
  MARKETPLACE_CATEGORY: null,
  DIGEST_GLOBAL: null,
};

export const EMAIL_DIGEST_FEATURE_KEY = 'subscriptions.member.notify.emailDigestEnabled';

export const SOURCE_DOMAINS: SourceDomain[] = ['auction', 'forum', 'marketplace', 'platform'];

export const TARGET_TYPES: TargetType[] = [
  'AUCTION_CATEGORY',
  'AUCTION',
  'FORUM_CATEGORY',
  'FORUM_TOPIC',
  'TAG',
  'MARKETPLACE_CATEGORY',
  'DIGEST_GLOBAL',
];

export const DIGEST_FREQUENCIES: DigestFrequency[] = ['DAILY', 'WEEKLY'];

export type MatchQuery = {
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId: string;
};

function asUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    ? v
    : null;
}

/** Map domain event → subscription lookup (pure; used by match API and future RMQ consumer). */
export function resolveMatchQuery(
  eventType: string,
  payload: Record<string, unknown>,
): MatchQuery | null {
  switch (eventType) {
    case 'auction.created': {
      const categoryId = asUuid(payload.categoryId);
      return categoryId
        ? { sourceDomain: 'auction', targetType: 'AUCTION_CATEGORY', targetId: categoryId }
        : null;
    }
    case 'auction.bid_placed':
    case 'auction.completed': {
      const auctionId = asUuid(payload.auctionId);
      return auctionId
        ? { sourceDomain: 'auction', targetType: 'AUCTION', targetId: auctionId }
        : null;
    }
    case 'forum.topic_created': {
      const categoryId = asUuid(payload.categoryId);
      return categoryId
        ? { sourceDomain: 'forum', targetType: 'FORUM_CATEGORY', targetId: categoryId }
        : null;
    }
    case 'forum.comment_created': {
      const topicId = asUuid(payload.topicId);
      return topicId
        ? { sourceDomain: 'forum', targetType: 'FORUM_TOPIC', targetId: topicId }
        : null;
    }
    case 'tag.content_tagged': {
      const tagId = asUuid(payload.tagId);
      return tagId ? { sourceDomain: 'platform', targetType: 'TAG', targetId: tagId } : null;
    }
    default:
      return null;
  }
}

/** Whether a digest preference is due for this UTC calendar day. */
export function isDigestDue(
  frequency: DigestFrequency,
  now: Date = new Date(),
): boolean {
  if (frequency === 'DAILY') return true;
  // WEEKLY: Monday UTC (ISO weekday 1)
  return now.getUTCDay() === 1;
}
