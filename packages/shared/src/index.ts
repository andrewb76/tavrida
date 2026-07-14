/** Shared types and utilities for Tavrida Lot (browser-safe). */
export const PLATFORM_NAME = 'Tavrida Lot' as const;

export { canEditForumContent, parseEditWindowMinutes } from './forum-edit-window.js';
export {
  canChangeForumVote,
  parseVoteChangeWindowMinutes,
  type ForumVoteValue,
} from './forum-vote-window.js';
export { forumVoteKarmaContribution, forumVoteKarmaDelta } from './forum-vote-karma.js';
export {
  createDomainEvent,
  dealFeedbackRatingDelta,
  DOMAIN_EVENTS_EXCHANGE,
  type DomainEventEnvelope,
} from './domain-events.js';
