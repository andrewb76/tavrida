/** Mirrors @tavrida/shared canChangeForumVote — 0 never, -1 always, >0 minutes from first vote. */
export function canChangeForumVote(
  firstVotedAt: Date,
  changeWindowMinutes: number,
  now = new Date(),
): boolean {
  const normalized = Number.isFinite(changeWindowMinutes)
    ? Math.trunc(changeWindowMinutes)
    : 3;
  if (normalized === 0) return false;
  if (normalized < 0) return true;
  return now.getTime() - firstVotedAt.getTime() <= normalized * 60_000;
}
