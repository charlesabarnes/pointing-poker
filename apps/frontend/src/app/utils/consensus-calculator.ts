/**
 * Determines if there is consensus among votes.
 *
 * Consensus exists when all votes are for the same value and there is at least one vote.
 *
 * @param voteCounts - Object mapping point values to their counts
 * @returns true if all votes are for the same value
 *
 * @example
 * hasConsensus({ "3": 5 }) // Returns true (everyone voted 3)
 * hasConsensus({ "3": 2, "5": 3 }) // Returns false (split vote)
 * hasConsensus({}) // Returns false (no votes)
 */
export function hasConsensus(voteCounts: Record<string, number>): boolean {
  const uniqueValues = Object.keys(voteCounts).length;
  const totalVotes = Object.values(voteCounts)[0] || 0;

  return uniqueValues === 1 && totalVotes > 0;
}
