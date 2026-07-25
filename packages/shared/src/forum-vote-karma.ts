/** Karma contribution of a content vote for the author. */
export type ForumVoteSign = 1 | -1 | null;

export function forumVoteKarmaContribution(
  vote: ForumVoteSign,
  plusWeight: number,
  minusWeight: number,
): number {
  if (vote === 1) return plusWeight;
  if (vote === -1) return -minusWeight;
  return 0;
}

/** Net karma delta for content author when a voter's vote changes. */
export function forumVoteKarmaDelta(
  previousVote: ForumVoteSign,
  nextVote: ForumVoteSign,
  plusWeight: number,
  minusWeight: number,
): number {
  return (
    forumVoteKarmaContribution(nextVote, plusWeight, minusWeight) -
    forumVoteKarmaContribution(previousVote, plusWeight, minusWeight)
  );
}
