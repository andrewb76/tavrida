/** Vote value on forum content (plus / minus / cleared). */
export type ForumVoteSign = 1 | -1 | null;

/** Net karma delta for content author when a voter's vote changes. */
export function forumVoteKarmaDelta(
  previousVote: ForumVoteSign,
  nextVote: ForumVoteSign,
  plusWeight: number,
  minusWeight: number,
): number {
  const contrib = (vote: ForumVoteSign) => {
    if (vote === 1) return plusWeight;
    if (vote === -1) return -minusWeight;
    return 0;
  };
  return contrib(nextVote) - contrib(previousVote);
}
