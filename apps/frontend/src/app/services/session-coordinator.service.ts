import { Injectable, OnDestroy, Signal, computed, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Message, MessageType, MESSAGE_TYPES } from 'shared';
import { WebSocketConnectionService, ConnectionState } from './websocket-connection.service';
import { UserPresenceService } from './user-presence.service';
import { SessionStateService } from './session-state.service';
import { UserFingerprintService } from './user-fingerprint.service';
import { ToastNotificationService } from './toast-notification.service';
import { MessageSender } from './message-sender.interface';

@Injectable({
  providedIn: 'root'
})
export class SessionCoordinatorService implements MessageSender, OnDestroy {
  private sessionId: string;
  private userName: string;
  private userFingerprint: string;
  private wasReconnecting = false;
  private isConnected = false;

  private wsConnection = inject(WebSocketConnectionService);
  private presenceService = inject(UserPresenceService);
  private sessionStateService = inject(SessionStateService);
  private fingerprintService = inject(UserFingerprintService);
  private toastService = inject(ToastNotificationService);
  private destroyRef = inject(DestroyRef);

  private activityCheckInterval: any;

  public connectionState: Signal<ConnectionState> = computed(() =>
    this.wsConnection.connectionState()
  );

  constructor() {
    this.userFingerprint = this.fingerprintService.getFingerprint();
    this.sessionStateService.setCurrentUserFingerprint(this.userFingerprint);
    this.sessionStateService.setMessageSender(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.handleBeforeUnload());
    }

    this.wsConnection.messages$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(message => {
      this.sessionStateService.handleMessage(message);
    });

    effect(() => {
      const state = this.wsConnection.connectionState();

      if (state === ConnectionState.CONNECTED && !this.isConnected) {
        this.isConnected = true;
        this.handleConnectionEstablished();
      } else if (state === ConnectionState.RECONNECTING) {
        this.wasReconnecting = true;
        this.isConnected = false;
      } else if (state === ConnectionState.ERROR) {
        this.isConnected = false;
        if (this.sessionId) {
          this.handleConnectionError();
        }
      } else if (state === ConnectionState.DISCONNECTED) {
        this.isConnected = false;
      }
    });
  }

  connect(sessionId: string, userName: string): void {
    this.sessionId = sessionId;
    this.userName = userName;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.host.replace('4200', '4000');
    const url = `${protocol}://${host}/?session=${sessionId}`;

    this.wsConnection.connect(url);
  }

  private handleConnectionEstablished(): void {
    if (this.wasReconnecting) {
      this.toastService.success('Reconnected to server');
      this.wasReconnecting = false;
    }

    this.send('', MESSAGE_TYPES.REQUEST_STATE);

    this.presenceService.startHeartbeat(() => {
      this.send('', MESSAGE_TYPES.HEARTBEAT);
    });

    this.presenceService.startStatusMonitoring((status) => {
      if (status === 'afk') {
        this.send('', MESSAGE_TYPES.STATUS_AFK);
      } else {
        this.send('', MESSAGE_TYPES.STATUS_ONLINE);
      }
    });

    this.startActivityChecking();

    this.wsConnection.sendRaw(
      new Message(this.userName, undefined, 'points', this.sessionId, Date.now(), this.userFingerprint)
    );

    setTimeout(() => {
      this.send('has joined the session', MESSAGE_TYPES.JOIN);
    }, 1000);
  }

  private handleConnectionError(): void {
    if (this.wasReconnecting) {
      this.toastService.warning('Connection lost. Reconnecting...');
    } else {
      this.toastService.error('Failed to connect to server');
    }
  }

  private startActivityChecking(): void {
    const STATUS_CHECK_INTERVAL = 10000;

    this.activityCheckInterval = setInterval(() => {
      const updatedActivity = this.presenceService.checkOtherUsersActivity(
        this.sessionStateService.userActivity(),
        this.userFingerprint
      );

      if (updatedActivity !== this.sessionStateService.userActivity()) {
        this.sessionStateService.userActivity.set(updatedActivity);
      }
    }, STATUS_CHECK_INTERVAL);
  }

  send(content: string | number, type: MessageType = MESSAGE_TYPES.POINTS): void {
    const message = new Message(
      this.userName,
      content,
      type,
      this.sessionId,
      Date.now(),
      this.userFingerprint
    );

    this.wsConnection.sendRaw(message);
  }

  disconnect(): void {
    this.presenceService.stopHeartbeat();
    this.presenceService.stopStatusMonitoring();

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    this.wsConnection.disconnect();
  }

  private handleBeforeUnload(): void {
    this.send('', MESSAGE_TYPES.USER_LEFT);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
