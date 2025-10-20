import * as WebSocket from 'ws';
import { Message, MESSAGE_TYPES } from 'shared';
import { SessionManager } from '../session/session-manager';
import { broadcastMessage } from './broadcast';
import { logger } from './logger';

export class TimerService {
  private intervalId: NodeJS.Timeout | null = null;
  private activeSessions: Set<string> = new Set();

  constructor(
    private wss: WebSocket.Server,
    private sessionManager: SessionManager
  ) {}

  public registerSession(sessionId: string): void {
    this.activeSessions.add(sessionId);
    if (!this.intervalId) {
      this.start();
    }
  }

  public unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    if (this.activeSessions.size === 0 && this.intervalId) {
      this.stop();
    }
  }

  private start(): void {
    logger.info('Starting timer service');
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private stop(): void {
    if (this.intervalId) {
      logger.info('Stopping timer service');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const sessionsToRemove: string[] = [];

    this.activeSessions.forEach(sessionId => {
      const timerState = this.sessionManager.getTimerState(sessionId);

      if (!timerState || timerState.status !== 'running') {
        sessionsToRemove.push(sessionId);
        return;
      }

      const { remainingTime, expired } = this.sessionManager.updateTimerTick(sessionId);

      const tickMessage = new Message(
        'server',
        remainingTime,
        MESSAGE_TYPES.TIMER_TICK,
        sessionId,
        Date.now()
      );

      broadcastMessage(this.wss, sessionId, tickMessage);

      if (expired) {
        logger.info(`Timer expired for session ${sessionId}, auto-revealing votes`);
        this.sessionManager.revealVotes(sessionId);

        const showVotesMessage = new Message(
          'server',
          'timer_expired',
          MESSAGE_TYPES.SHOW_VOTES,
          sessionId,
          Date.now()
        );

        broadcastMessage(this.wss, sessionId, showVotesMessage);
        sessionsToRemove.push(sessionId);
      }
    });

    sessionsToRemove.forEach(sessionId => {
      this.unregisterSession(sessionId);
    });
  }

  public cleanup(): void {
    this.stop();
    this.activeSessions.clear();
  }
}
