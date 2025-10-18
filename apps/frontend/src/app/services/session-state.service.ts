import { Injectable, signal, computed, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Message, PointValues, UserActivity, MESSAGE_TYPES, SessionState } from 'shared';
import { create } from 'canvas-confetti';
import { MessageSender } from './message-sender.interface';
import { aggregateVotes } from '../utils/vote-aggregator';
import { hasConsensus as calculateConsensus } from '../utils/consensus-calculator';

const createConfettiCanvas = create(undefined, { useWorker: true, resize: true });

@Injectable({
  providedIn: 'root'
})
export class SessionStateService {
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private messageSender: MessageSender | null = null;

  public pointValues = signal<PointValues>({});
  public userActivity = signal<Record<string, UserActivity>>({});
  public userNames = signal<Record<string, string>>({});
  public chatLog = signal<Message[]>([]);
  public description = signal<string>('');
  public votesRevealed = signal<boolean>(false);
  public confettiShot = signal<boolean>(false);
  public selectedPointValue = signal<number | undefined>(undefined);
  public isSpectator = signal<boolean>(false);
  public newUserJoined = signal<boolean>(false);
  public recentJoinedUser = signal<string>('');

  private currentUserFingerprint: string;

  public userFingerprints = computed(() => Object.keys(this.pointValues()));

  public users = computed(() => {
    const fingerprints = this.userFingerprints();
    const userNames = this.userNames();
    return fingerprints.map(fingerprint => ({
      fingerprint,
      displayName: userNames[fingerprint] || 'Unknown'
    }));
  });

  public showValues = computed(() => {
    const pointValues = this.pointValues();
    const fingerprints = Object.keys(pointValues);

    const allVoted = fingerprints.filter((fingerprint: string) => {
      return !pointValues[fingerprint];
    }).length === 0;

    return allVoted || this.votesRevealed();
  });

  public showChart = computed(() => {
    return this.showValues() && this.userFingerprints().length > 0;
  });

  public hasConsensus = computed(() => {
    const pointValues = this.pointValues();
    const voteCounts = aggregateVotes(pointValues);
    return calculateConsensus(voteCounts);
  });

  setCurrentUserFingerprint(fingerprint: string): void {
    this.currentUserFingerprint = fingerprint;
  }

  getCurrentUserFingerprint(): string {
    return this.currentUserFingerprint;
  }

  isCurrentUser(fingerprint: string): boolean {
    return fingerprint === this.currentUserFingerprint;
  }

  getDisplayName(fingerprint: string): string {
    return this.userNames()[fingerprint] || 'Unknown';
  }

  handleMessage(message: Message): void {
    if (!message || message.sender === 'NS') {
      return;
    }

    if (!message.fingerprint) {
      console.warn('Received message without fingerprint:', message);
    }

    const userKey = message.fingerprint || message.sender;

    this.updateUserName(userKey, message.sender);
    this.updateUserActivity(userKey, message.timestamp);

    switch (message.type) {
      case MESSAGE_TYPES.DISCONNECT:
      case MESSAGE_TYPES.USER_LEFT:
        this.handleDisconnect(userKey);
        break;
      case MESSAGE_TYPES.POINTS:
        this.handlePoints(userKey, message.content);
        break;
      case MESSAGE_TYPES.CHAT:
        this.handleChat(message);
        break;
      case MESSAGE_TYPES.DESCRIPTION:
        this.handleDescription(message.content as string);
        break;
      case MESSAGE_TYPES.HEARTBEAT:
        break;
      case MESSAGE_TYPES.STATUS_AFK:
        this.updateUserStatus(userKey, 'afk', message.timestamp);
        break;
      case MESSAGE_TYPES.STATUS_ONLINE:
        this.updateUserStatus(userKey, 'online', message.timestamp);
        break;
      case MESSAGE_TYPES.STATUS_OFFLINE:
        this.updateUserStatus(userKey, 'offline', message.timestamp);
        break;
      case MESSAGE_TYPES.JOIN:
        this.handleJoin(message);
        break;
      case MESSAGE_TYPES.NAME_CHANGED:
        if (message.fingerprint) {
          this.handleNameChange(message.fingerprint, message.sender);
        }
        break;
      case MESSAGE_TYPES.SHOW_VOTES:
        this.handleShowVotes();
        break;
      case MESSAGE_TYPES.CLEAR_VOTES:
        this.handleClearVotes();
        break;
      case MESSAGE_TYPES.STATE_SYNC:
        this.handleStateSync(message);
        break;
      default:
        break;
    }
  }

  private handleStateSync(message: Message): void {
    console.log('Processing state sync in SessionStateService');

    try {
      const state: SessionState = JSON.parse(message.content as string);

      const newPointValues: PointValues = {};
      state.participants.forEach(p => {
        newPointValues[p.fingerprint] = state.votes[p.fingerprint];
      });
      this.pointValues.set(newPointValues);

      const newUserNames: Record<string, string> = {};
      state.participants.forEach(p => {
        newUserNames[p.fingerprint] = p.name;
      });
      this.userNames.set(newUserNames);

      this.description.set(state.description);
      this.votesRevealed.set(state.votesRevealed);

      const newActivity: Record<string, UserActivity> = {};
      state.participants.forEach(p => {
        newActivity[p.fingerprint] = {
          lastActive: Date.now(),
          status: 'online'
        };
      });
      const currentActivity = this.userActivity();
      Object.keys(currentActivity).forEach(fingerprint => {
        if (!newActivity[fingerprint]) {
          newActivity[fingerprint] = currentActivity[fingerprint];
        }
      });
      this.userActivity.set(newActivity);

      if (state.votesRevealed && !this.confettiShot()) {
        this.checkAndTriggerConfetti();
      }

      console.log('State sync complete', {
        votes: Object.keys(state.votes).length,
        participants: state.participants.length,
        revealed: state.votesRevealed,
        hasDescription: !!state.description
      });
    } catch (error) {
      console.error('Failed to parse state sync message', error);
    }
  }

  private updateUserName(key: string, displayName: string): void {
    const names = this.userNames();
    if (names[key] !== displayName) {
      names[key] = displayName;
      this.userNames.set({ ...names });
    }
  }

  private updateUserActivity(fingerprint: string, timestamp?: number): void {
    const activity = this.userActivity();
    const currentTime = timestamp || Date.now();

    if (!activity[fingerprint]) {
      activity[fingerprint] = {
        lastActive: currentTime,
        status: 'online'
      };
    } else {
      activity[fingerprint].lastActive = currentTime;
      if (activity[fingerprint].status === 'offline') {
        activity[fingerprint].status = 'online';
      }
    }

    this.userActivity.set({ ...activity });
  }

  private updateUserStatus(fingerprint: string, status: 'online' | 'afk' | 'offline', timestamp?: number): void {
    const activity = this.userActivity();
    const currentTime = timestamp || Date.now();

    if (!activity[fingerprint]) {
      activity[fingerprint] = {
        lastActive: currentTime,
        status: status
      };
    } else {
      activity[fingerprint].lastActive = currentTime;
      activity[fingerprint].status = status;
    }

    this.userActivity.set({ ...activity });
  }

  private handleDisconnect(fingerprint: string): void {
    const points = this.pointValues();
    delete points[fingerprint];
    this.pointValues.set({ ...points });

    const activity = this.userActivity();
    if (activity[fingerprint]) {
      activity[fingerprint].status = 'offline';
      this.userActivity.set({ ...activity });
    }

    const names = this.userNames();
    delete names[fingerprint];
    this.userNames.set({ ...names });
  }

  private handlePoints(fingerprint: string, content: string | number | undefined): void {
    const points = this.pointValues();
    points[fingerprint] = content;
    this.pointValues.set({ ...points });

    const fingerprints = Object.keys(points);
    const allVoted = fingerprints.filter((fp: string) => !points[fp]).length === 0;

    if (allVoted && fingerprints.length > 0 && !this.votesRevealed()) {
      this.checkAndTriggerConfetti();
    }

    if (this.isCurrentUser(fingerprint)) {
      if (content === undefined) {
        this.resetSelectedValue();
        if (!this.showChart()) {
          this.resetConfetti();
        }
      } else if (typeof content === 'number' && this.selectedPointValue() !== content) {
        this.selectedPointValue.set(content);
      }
    }
  }

  private handleNameChange(fingerprint: string, newName: string): void {
    console.log(`User ${this.userNames()[fingerprint]} changed name to ${newName}`);
    this.updateUserName(fingerprint, newName);
  }

  private handleChat(message: Message): void {
    this.chatLog.update(log => [...log, message]);
  }

  private handleDescription(description: string): void {
    this.description.set(description);
  }

  private handleJoin(message: Message): void {
    this.chatLog.update(log => [...log, message]);

    const fingerprint = message.fingerprint || message.sender;
    const points = this.pointValues();
    if (!points.hasOwnProperty(fingerprint)) {
      points[fingerprint] = undefined;
      this.pointValues.set({ ...points });
    }

    if (!this.isCurrentUser(fingerprint)) {
      this.newUserJoined.set(true);
      this.recentJoinedUser.set(message.sender);

      setTimeout(() => {
        this.newUserJoined.set(false);
        this.recentJoinedUser.set('');
      }, 5000);
    }
  }

  private handleShowVotes(): void {
    this.votesRevealed.set(true);
    this.checkAndTriggerConfetti();
  }

  private handleClearVotes(): void {
    const points = this.pointValues();
    Object.keys(points).forEach(fingerprint => {
      points[fingerprint] = undefined;
    });
    this.pointValues.set({ ...points });

    this.votesRevealed.set(false);
    this.confettiShot.set(false);
    this.resetSelectedValue();
  }

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

  resetSelectedValue(): void {
    this.selectedPointValue.set(0);
  }

  resetConfetti(): void {
    this.confettiShot.set(false);
  }

  setMessageSender(sender: MessageSender): void {
    this.messageSender = sender;
  }

  forceShowValues(): void {
    this.votesRevealed.set(true);
    this.messageSender?.send('', MESSAGE_TYPES.SHOW_VOTES);
  }

  clearVotes(): void {
    this.votesRevealed.set(false);
    this.confettiShot.set(false);
    this.messageSender?.send('', MESSAGE_TYPES.CLEAR_VOTES);
    this.messageSender?.send('', MESSAGE_TYPES.DESCRIPTION);
  }

  setSpectatorMode(isSpectator: boolean): void {
    this.isSpectator.set(isSpectator);
    this.messageSender?.send(isSpectator ? 'spectate' : 0);
  }

  selectPointValue(value: number): void {
    this.selectedPointValue.set(value);
    this.messageSender?.send(value);
  }

  updateDescription(value: string): void {
    this.description.set(value);
    this.messageSender?.send(value, 'description');
  }
}
