export type SourceDomain = 'auction' | 'forum' | 'marketplace' | 'platform';

export type TargetType =
  | 'AUCTION_CATEGORY'
  | 'AUCTION'
  | 'FORUM_CATEGORY'
  | 'FORUM_TOPIC'
  | 'TAG'
  | 'MARKETPLACE_CATEGORY'
  | 'DIGEST_GLOBAL';

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
