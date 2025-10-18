/**
 * Manages session state including votes and reveal status
 * This centralizes all session-related state management
 */
export class SessionManager {
  // Persistent vote storage (per session, per fingerprint)
  private sessionVotes: Record<string, Record<string, string | number | undefined>> = {};

  // Track if votes have been revealed (shown) per session
  private sessionVotesRevealed: Record<string, boolean> = {};

  // Track last activity per session for cleanup
  private sessionLastActivity: Record<string, number> = {};

  // Track description per session
  private sessionDescriptions: Record<string, string> = {};

  /**
   * Store a vote for a user in a session
   */
  public setVote(sessionId: string, fingerprint: string, vote: string | number | undefined): void {
    if (!this.sessionVotes[sessionId]) {
      this.sessionVotes[sessionId] = {};
    }
    this.sessionVotes[sessionId][fingerprint] = vote;
    this.updateSessionActivity(sessionId);
  }

  /**
   * Get a user's vote in a session
   */
  public getVote(sessionId: string, fingerprint: string): string | number | undefined {
    return this.sessionVotes[sessionId]?.[fingerprint];
  }

  /**
   * Get all votes for a session
   */
  public getSessionVotes(sessionId: string): Record<string, string | number | undefined> {
    return this.sessionVotes[sessionId] || {};
  }

  /**
   * Clear all votes in a session
   */
  public clearVotes(sessionId: string): void {
    delete this.sessionVotes[sessionId];
    this.sessionVotesRevealed[sessionId] = false;
    this.updateSessionActivity(sessionId);
  }

  /**
   * Set description for a session
   */
  public setDescription(sessionId: string, description: string): void {
    this.sessionDescriptions[sessionId] = description;
    this.updateSessionActivity(sessionId);
  }

  /**
   * Get description for a session
   */
  public getDescription(sessionId: string): string {
    return this.sessionDescriptions[sessionId] || '';
  }

  /**
   * Mark votes as revealed for a session
   */
  public revealVotes(sessionId: string): void {
    this.sessionVotesRevealed[sessionId] = true;
    this.updateSessionActivity(sessionId);
  }

  /**
   * Check if votes are revealed for a session
   */
  public areVotesRevealed(sessionId: string): boolean {
    return this.sessionVotesRevealed[sessionId] || false;
  }

  /**
   * Update last activity timestamp for a session
   */
  public updateSessionActivity(sessionId: string): void {
    this.sessionLastActivity[sessionId] = Date.now();
  }

  /**
   * Get last activity timestamp for a session
   */
  public getSessionLastActivity(sessionId: string): number {
    return this.sessionLastActivity[sessionId] || 0;
  }

  /**
   * Clean up old sessions that haven't been active
   * @param inactivityThreshold - Time in ms after which to clean up inactive sessions
   * @returns Number of sessions cleaned up
   */
  public cleanupInactiveSessions(inactivityThreshold: number): number {
    const now = Date.now();
    let cleanedCount = 0;

    const allSessionIds = new Set([
      ...Object.keys(this.sessionVotes),
      ...Object.keys(this.sessionVotesRevealed),
      ...Object.keys(this.sessionLastActivity),
      ...Object.keys(this.sessionDescriptions)
    ]);

    allSessionIds.forEach(sessionId => {
      const lastActivity = this.sessionLastActivity[sessionId] || 0;
      if (now - lastActivity > inactivityThreshold) {
        delete this.sessionVotes[sessionId];
        delete this.sessionVotesRevealed[sessionId];
        delete this.sessionLastActivity[sessionId];
        delete this.sessionDescriptions[sessionId];
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  /**
   * Get statistics about session storage
   */
  public getStats(): {
    activeSessions: number;
    totalVotes: number;
    revealedSessions: number;
  } {
    const activeSessions = Object.keys(this.sessionLastActivity).length;
    const revealedSessions = Object.values(this.sessionVotesRevealed).filter(Boolean).length;

    let totalVotes = 0;
    Object.values(this.sessionVotes).forEach(sessionVotes => {
      totalVotes += Object.keys(sessionVotes).length;
    });

    return {
      activeSessions,
      totalVotes,
      revealedSessions
    };
  }
}
