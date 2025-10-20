import { PointValues } from 'shared';

/**
 * Aggregates votes from point values into counts per value.
 *
 * @param pointValues - The point values from all users
 * @returns Object mapping point values to their counts (e.g., { "3": 2, "5": 1 })
 *
 * @example
 * const pointValues = { user1: 3, user2: 3, user3: 5 };
 * aggregateVotes(pointValues) // Returns { "3": 2, "5": 1 }
 */
export function aggregateVotes(pointValues: PointValues): Record<string, number> {
  const voteCounts: Record<string, number> = {};

  for (const fingerprint in pointValues) {
    if (pointValues.hasOwnProperty(fingerprint)) {
      const vote = pointValues[fingerprint];

      // Exclude disconnect and undefined/null values
      if (vote !== 'disconnect' && vote !== undefined && vote !== null) {
        const voteKey = String(vote);
        voteCounts[voteKey] = (voteCounts[voteKey] || 0) + 1;
      }
    }
  }

  return voteCounts;
}
