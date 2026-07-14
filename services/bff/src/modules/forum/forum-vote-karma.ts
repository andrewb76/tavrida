/** Net karma delta for content author when a voter's vote changes. */
export function forumVoteKarmaDelta(
  previousVote: 1 | -1 | null,
  nextVote: 1 | -1 | null,
  plusWeight: number,
  minusWeight: number,
): number {
  const contrib = (vote: 1 | -1 | null) => {
    if (vote === 1) return plusWeight;
    if (vote === -1) return -minusWeight;
    return 0;
  };
  return contrib(nextVote) - contrib(previousVote);
}
