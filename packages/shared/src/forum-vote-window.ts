import { canEditForumContent, parseEditWindowMinutes } from './forum-edit-window.js';

export type ForumVoteValue = 1 | -1;

/** Same semantics as edit window: 0 = locked, -1 = always, >0 = minutes from first vote. */
export function canChangeForumVote(
  firstVotedAt: Date | string,
  changeWindowMinutes: number,
  now: Date = new Date(),
): boolean {
  return canEditForumContent(firstVotedAt, changeWindowMinutes, now);
}

export { parseEditWindowMinutes as parseVoteChangeWindowMinutes };
