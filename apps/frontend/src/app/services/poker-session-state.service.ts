import { Injectable, signal, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PokerWebSocketService } from './poker-websocket.service';
import { MESSAGE_TYPES } from 'shared';
import { create } from 'canvas-confetti';

// Confetti canvas
const createConfettiCanvas = create(undefined, { useWorker: true, resize: true });

/**
 * Manages UI-only state for the poker session
 * Separate from WebSocket communication state
 */
@Injectable({
  providedIn: 'root'
})
export class PokerSessionStateService {
  // UI State Signals
  public showValuesForced = signal<boolean>(false);
  public isSpectator = signal<boolean>(false);
  public confettiShot = signal<boolean>(false);
  public selectedPointValue = signal<number | undefined>(undefined);

  private destroyRef = inject(DestroyRef);

  constructor(private wsService: PokerWebSocketService) {
    // Subscribe to websocket messages to sync UI state
    // Using takeUntilDestroyed for proper cleanup
    this.wsService.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(message => {
        if (message.type === MESSAGE_TYPES.SHOW_VOTES) {
          this.showValuesForced.set(true);
          // Trigger confetti if there's consensus when votes are shown
          this.checkAndTriggerConfetti();
        } else if (message.type === MESSAGE_TYPES.CLEAR_VOTES) {
          this.showValuesForced.set(false);
          this.confettiShot.set(false);
        }
      });
  }

  /**
   * Computed signal that determines if values should be shown
   * Either all users have voted OR show is forced
   */
  public showValues = computed(() => {
    const pointValues = this.wsService.pointValues();
    const fingerprints = Object.keys(pointValues);

    const allVoted = fingerprints.filter((fingerprint: string) => {
      return !pointValues[fingerprint];
    }).length === 0;

    return allVoted || this.showValuesForced();
  });

  /**
   * Computed signal for user fingerprints (participants)
   * NOTE: Returns fingerprints, not usernames. Use wsService.getDisplayName(fingerprint) to get the name.
   */
  public userFingerprints = computed(() => Object.keys(this.wsService.pointValues()));

  /**
   * Computed signal for users with name and fingerprint
   * Returns array of { fingerprint, displayName }
   */
  public users = computed(() => {
    const fingerprints = this.userFingerprints();
    const userNames = this.wsService.userNames();
    return fingerprints.map(fingerprint => ({
      fingerprint,
      displayName: userNames[fingerprint] || 'Unknown'
    }));
  });

  /**
   * Computed signal to determine if chart should be shown
   */
  public showChart = computed(() => {
    return this.showValues() && this.userFingerprints().length > 0;
  });

  /**
   * Force values to be shown (broadcasts to all clients)
   */
  public forceShowValues(): void {
    this.showValuesForced.set(true);
    this.wsService.showVotes();
  }

  /**
   * Clear all votes and reset UI state
   */
  public clearVotes(): void {
    this.showValuesForced.set(false);
    this.confettiShot.set(false);
    this.wsService.clearVotes();
  }

  /**
   * Toggle spectator mode
   */
  public setSpectatorMode(isSpectator: boolean): void {
    this.isSpectator.set(isSpectator);
    // Note: Using 'spectate' string for backwards compatibility
    // TODO: Update to use SPECIAL_CONTENT.SPECTATE after backend migration
    this.wsService.send(isSpectator ? 'spectate' : 0);
  }

  /**
   * Select a point value
   */
  public selectPointValue(value: number): void {
    this.selectedPointValue.set(value);
    this.wsService.send(value);
  }

  /**
   * Reset confetti flag
   */
  public resetConfetti(): void {
    this.confettiShot.set(false);
  }

  /**
   * Mark confetti as shot
   */
  public markConfettiShot(): void {
    this.confettiShot.set(true);
  }

  /**
   * Reset selected point value (typically when votes are cleared)
   */
  public resetSelectedValue(): void {
    this.selectedPointValue.set(0);
  }

  /**
   * Check if there's consensus (all voters have the same vote)
   * Excludes spectators and disconnected users
   */
  private hasConsensus(): boolean {
    const pointValues = this.wsService.pointValues();
    const voteCounts: Record<string, number> = {};

    // Count votes, excluding disconnects and undefined values
    for (const fingerprint in pointValues) {
      if (pointValues.hasOwnProperty(fingerprint)) {
        const vote = pointValues[fingerprint];
        if (vote !== 'disconnect' && vote !== undefined) {
          const voteKey = String(vote);
          voteCounts[voteKey] = (voteCounts[voteKey] || 0) + 1;
        }
      }
    }

    // Consensus = exactly one unique vote value with at least one voter
    return Object.keys(voteCounts).length === 1 && Object.values(voteCounts)[0] > 0;
  }

  /**
   * Check for consensus and trigger confetti if conditions are met
   */
  private checkAndTriggerConfetti(): void {
    if (this.hasConsensus() && !this.confettiShot()) {
      createConfettiCanvas({
        shapes: ['square'],
        particleCount: 100,
        spread: 70,
        angle: 42,
      });
      this.confettiShot.set(true);
    }
  }
}
