export type ChatKind = 'DIRECT' | 'GROUP' | 'TOPIC';

export type ChatMemberRole = 'OWNER' | 'MEMBER';

export type ChatContextType = 'FORUM_TOPIC';

export type MessageMention = {
  userId: string;
  username: string;
  offset: number;
  length: number;
};

/** Author-facing delivery status (API). `SENDING` is client-only. */
export type MessageDeliveryStatus = 'DELIVERED' | 'READ';

/** Canonical DIRECT pair key: sorted opaque Logto subs joined by `:`. */
export function directPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

export function directSelfKey(userId: string): string {
  return `self:${userId}`;
}

/**
 * Status for the viewer when they are the author.
 * Returns null for messages authored by someone else (UI hides ticks).
 * Self-DM: null (notes — no delivery UX).
 */
export function computeMessageDeliveryStatus(input: {
  authorId: string;
  viewerId: string;
  selfChat: boolean;
  messageCreatedAt: Date;
  otherMembersLastReadAt: Array<Date | null>;
}): MessageDeliveryStatus | null {
  if (input.authorId !== input.viewerId) return null;
  if (input.selfChat) return null;
  if (input.otherMembersLastReadAt.length === 0) return 'DELIVERED';
  const allRead = input.otherMembersLastReadAt.every(
    (at) => at != null && at.getTime() >= input.messageCreatedAt.getTime(),
  );
  return allRead ? 'READ' : 'DELIVERED';
}
