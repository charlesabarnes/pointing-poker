import { Injectable, signal, computed } from '@angular/core';
import { PokerWebSocketService } from './poker-websocket.service';

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

  constructor(private wsService: PokerWebSocketService) {}

  /**
   * Computed signal that determines if values should be shown
   * Either all users have voted OR show is forced
   */
  public showValues = computed(() => {
    const pointValues = this.wsService.pointValues();
    const userNames = Object.keys(pointValues);

    const allVoted = userNames.filter((name: string) => {
      return !pointValues[name];
    }).length === 0;

    return allVoted || this.showValuesForced();
  });

  /**
   * Computed signal for user names
   */
  public userNames = computed(() => Object.keys(this.wsService.pointValues()));

  /**
   * Computed signal to determine if chart should be shown
   */
  public showChart = computed(() => {
    return this.showValues() && this.userNames().length > 0;
  });

  /**
   * Force values to be shown
   */
  public forceShowValues(): void {
    this.showValuesForced.set(true);
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
}
