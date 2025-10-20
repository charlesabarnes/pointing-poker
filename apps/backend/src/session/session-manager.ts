import { TimerState, TimerStatus } from '@pointing-poker/shared';

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

  // Track timer state per session
  private sessionTimers: Record<string, TimerState> = {};

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

  public clearVotes(sessionId: string): void {
    delete this.sessionVotes[sessionId];
    this.sessionVotesRevealed[sessionId] = false;
    this.stopTimer(sessionId);
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

  public startTimer(sessionId: string, duration: number): void {
    this.sessionTimers[sessionId] = {
      duration,
      remainingTime: duration,
      status: 'running',
      startedAt: Date.now(),
    };
    this.updateSessionActivity(sessionId);
  }

  public pauseTimer(sessionId: string): void {
    const timer = this.sessionTimers[sessionId];
    if (timer && timer.status === 'running') {
      timer.status = 'paused';
      timer.pausedAt = Date.now();
    }
    this.updateSessionActivity(sessionId);
  }

  public resumeTimer(sessionId: string): void {
    const timer = this.sessionTimers[sessionId];
    if (timer && timer.status === 'paused') {
      timer.status = 'running';
      delete timer.pausedAt;
      timer.startedAt = Date.now();
    }
    this.updateSessionActivity(sessionId);
  }

  public stopTimer(sessionId: string): void {
    if (this.sessionTimers[sessionId]) {
      this.sessionTimers[sessionId] = {
        duration: 0,
        remainingTime: 0,
        status: 'idle',
      };
    }
    this.updateSessionActivity(sessionId);
  }

  public extendTimer(sessionId: string, additionalSeconds: number): void {
    const timer = this.sessionTimers[sessionId];
    if (timer) {
      timer.duration += additionalSeconds;
      timer.remainingTime += additionalSeconds;
    }
    this.updateSessionActivity(sessionId);
  }

  public getTimerState(sessionId: string): TimerState | undefined {
    return this.sessionTimers[sessionId];
  }

  public updateTimerTick(sessionId: string): { remainingTime: number; expired: boolean } {
    const timer = this.sessionTimers[sessionId];
    if (!timer || timer.status !== 'running') {
      return { remainingTime: timer?.remainingTime || 0, expired: false };
    }

    timer.remainingTime = Math.max(0, timer.remainingTime - 1);

    if (timer.remainingTime === 0) {
      timer.status = 'idle';
      return { remainingTime: 0, expired: true };
    }

    return { remainingTime: timer.remainingTime, expired: false };
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
      ...Object.keys(this.sessionDescriptions),
      ...Object.keys(this.sessionTimers)
    ]);

    allSessionIds.forEach(sessionId => {
      const lastActivity = this.sessionLastActivity[sessionId] || 0;
      if (now - lastActivity > inactivityThreshold) {
        delete this.sessionVotes[sessionId];
        delete this.sessionVotesRevealed[sessionId];
        delete this.sessionLastActivity[sessionId];
        delete this.sessionDescriptions[sessionId];
        delete this.sessionTimers[sessionId];
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
