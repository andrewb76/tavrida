export type ChatKind = 'DIRECT' | 'GROUP' | 'TOPIC';

export type ChatMemberRole = 'OWNER' | 'MEMBER';

export type ChatContextType = 'FORUM_TOPIC';

export type MessageMention = {
  userId: string;
  username: string;
  offset: number;
  length: number;
};

/** Canonical DIRECT pair key: sorted opaque Logto subs joined by `:`. */
export function directPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

export function directSelfKey(userId: string): string {
  return `self:${userId}`;
}
