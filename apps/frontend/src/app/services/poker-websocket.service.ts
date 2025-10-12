import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Subject, Observable } from 'rxjs';
import { Message, MessageType, UserActivity, PointValues, MESSAGE_TYPES } from 'shared';
import { UserFingerprintService } from './user-fingerprint.service';
import { UserActivityService } from './user-activity.service';

@Injectable({
  providedIn: 'root'
})
export class PokerWebSocketService implements OnDestroy {
  private _webSocket: WebSocketSubject<any>;
  private _messageSubject = new Subject<Message>();
  private heartbeatWorker: Worker | null = null;
  private activityInterval: any;
  private statusCheckInterval: any;

  private sessionId: string;
  private userName: string;
  private userFingerprint: string;

  // Public signals for component state
  // NOTE: All keyed by FINGERPRINT, not username
  public pointValues = signal<PointValues>({});
  public chatLog = signal<Message[]>([]);
  public userActivity = signal<Record<string, UserActivity>>({});
  public userNames = signal<Record<string, string>>({}); // fingerprint -> display name mapping
  public lastDescription = signal<string>('');
  public newUserJoined = signal<boolean>(false);
  public recentJoinedUser = signal<string>('');

  // Constants
  private readonly OFFLINE_THRESHOLD = 3600000; // 1 hour for true disconnect
  private readonly AFK_THRESHOLD = 120000; // 2 minutes for AFK
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly STATUS_CHECK_INTERVAL = 10000; // 10 seconds

  // Track current status to avoid redundant sends
  private currentStatus: 'online' | 'afk' | 'offline' = 'online';

  // Observable stream of all messages
  public messages$: Observable<Message> = this._messageSubject.asObservable();

  constructor(
    private fingerprintService: UserFingerprintService,
    private activityService: UserActivityService
  ) {
    this.userFingerprint = this.fingerprintService.getFingerprint();

    // Listen for beforeunload to send graceful disconnect
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.handleBeforeUnload());
    }
  }

  /**
   * Initialize WebSocket connection
   */
  public connect(sessionId: string, userName: string): void {
    this.sessionId = sessionId;
    this.userName = userName;

    // Create WebSocket connection
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.host.replace('4200', '4000');
    const url = `${protocol}://${host}/?session=${sessionId}`;

    this._webSocket = webSocket(url);

    // Subscribe to incoming messages
    this._webSocket.subscribe({
      next: (message: Message) => this.handleMessage(message),
      error: (err) => console.error('WebSocket error:', err),
      complete: () => console.log('WebSocket connection closed')
    });

    // Send initial message with fingerprint
    this._webSocket.next(
      new Message(userName, undefined, 'points', sessionId, Date.now(), this.userFingerprint)
    );

    // Setup intervals
    this.setupHeartbeat();
    this.setupStatusMonitor();

    // Announce user has joined
    setTimeout(() => {
      this.send('has joined the session', MESSAGE_TYPES.JOIN);
    }, 1000);
  }

  /**
   * Send a message through the WebSocket
   */
  public send(content: string | number, type: MessageType = MESSAGE_TYPES.POINTS): void {
    if (!this._webSocket) {
      console.error('WebSocket not connected');
      return;
    }

    const message = new Message(
      this.userName,
      content,
      type,
      this.sessionId,
      Date.now(),
      this.userFingerprint
    );
    this._webSocket.next(message);
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    this.stopHeartbeatWorker();

    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this._webSocket) {
      this._webSocket.complete();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(res: Message): void {
    if (!res || res.sender === 'NS') {
      return;
    }

    // If no fingerprint, log warning but continue processing
    if (!res.fingerprint) {
      console.warn('Received message without fingerprint:', res);
      // For backwards compatibility and initial state sync, we'll still process it
      // but we won't be able to track this user properly
    }

    // Use fingerprint as key, or fall back to sender name if no fingerprint
    const userKey = res.fingerprint || res.sender;

    // Update user name mapping (handles name changes automatically)
    // Even without fingerprint, we map the key to the display name
    this.updateUserName(userKey, res.sender);

    // Emit message to subscribers
    this._messageSubject.next(res);

    // Update user activity
    this.updateUserActivity(userKey, res.timestamp);

    // Handle different message types
    switch (res.type) {
      case MESSAGE_TYPES.DISCONNECT:
      case MESSAGE_TYPES.USER_LEFT:
        this.handleDisconnect(userKey);
        break;
      case MESSAGE_TYPES.POINTS:
        this.handlePoints(userKey, res.content);
        break;
      case MESSAGE_TYPES.CHAT:
        this.handleChat(res);
        break;
      case MESSAGE_TYPES.DESCRIPTION:
        this.handleDescription(res.content as string);
        break;
      case MESSAGE_TYPES.HEARTBEAT:
        // Activity already updated above
        break;
      case MESSAGE_TYPES.STATUS_AFK:
        this.updateUserStatus(userKey, 'afk', res.timestamp);
        break;
      case MESSAGE_TYPES.STATUS_ONLINE:
        this.updateUserStatus(userKey, 'online', res.timestamp);
        break;
      case MESSAGE_TYPES.JOIN:
        this.handleJoin(res);
        break;
      case MESSAGE_TYPES.NAME_CHANGED:
        if (res.fingerprint) {
          this.handleNameChange(res.fingerprint, res.sender);
        }
        break;
      case MESSAGE_TYPES.SHOW_VOTES:
        // Handled by state service via messages$ observable
        break;
      case MESSAGE_TYPES.CLEAR_VOTES:
        // Handled by state service via messages$ observable
        break;
      default:
        break;
    }
  }

  /**
   * Update user name mapping (fingerprint/username -> display name)
   * @param key - Either fingerprint (preferred) or username (fallback)
   * @param displayName - The display name for this user
   */
  private updateUserName(key: string, displayName: string): void {
    const names = this.userNames();
    if (names[key] !== displayName) {
      names[key] = displayName;
      this.userNames.set({ ...names });
    }
  }

  /**
   * Update user activity tracking (keyed by fingerprint)
   */
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
      // Only update to online if not explicitly set to another status
      if (activity[fingerprint].status === 'offline') {
        activity[fingerprint].status = 'online';
      }
    }

    this.userActivity.set({ ...activity });
  }

  /**
   * Update user status (for AFK/online state changes, keyed by fingerprint)
   */
  private updateUserStatus(fingerprint: string, status: 'online' | 'afk', timestamp?: number): void {
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

  /**
   * Handle disconnect message (keyed by fingerprint)
   */
  private handleDisconnect(fingerprint: string): void {
    const points = this.pointValues();
    delete points[fingerprint];
    this.pointValues.set({ ...points });

    const activity = this.userActivity();
    if (activity[fingerprint]) {
      activity[fingerprint].status = 'offline';
      this.userActivity.set({ ...activity });
    }

    // Also remove from userNames mapping
    const names = this.userNames();
    delete names[fingerprint];
    this.userNames.set({ ...names });
  }

  /**
   * Handle points message (keyed by fingerprint)
   */
  private handlePoints(fingerprint: string, content: string | number | undefined): void {
    const points = this.pointValues();
    points[fingerprint] = content;
    this.pointValues.set({ ...points });
  }

  /**
   * Handle name change event
   */
  private handleNameChange(fingerprint: string, newName: string): void {
    console.log(`User ${this.userNames()[fingerprint]} changed name to ${newName}`);
    this.updateUserName(fingerprint, newName);
  }

  /**
   * Handle chat message
   */
  private handleChat(message: Message): void {
    this.chatLog.update(log => [...log, message]);
  }

  /**
   * Handle description message
   */
  private handleDescription(description: string): void {
    this.lastDescription.set(description);
  }

  /**
   * Handle join message
   */
  private handleJoin(message: Message): void {
    // Add to chat log
    this.chatLog.update(log => [...log, message]);

    // Show notification if it's not the current user
    if (message.sender !== this.userName) {
      this.newUserJoined.set(true);
      this.recentJoinedUser.set(message.sender);

      // Auto-clear after 5 seconds
      setTimeout(() => {
        this.newUserJoined.set(false);
        this.recentJoinedUser.set('');
      }, 5000);
    }
  }

  /**
   * Setup heartbeat mechanism using Web Worker
   */
  private setupHeartbeat(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, using fallback setInterval');
      // Fallback to setInterval if workers not supported
      setInterval(() => this.send('', MESSAGE_TYPES.HEARTBEAT), this.HEARTBEAT_INTERVAL);
      return;
    }

    try {
      this.heartbeatWorker = new Worker(
        new URL('../workers/heartbeat.worker', import.meta.url),
        { type: 'module' }
      );

      this.heartbeatWorker.onmessage = (event: MessageEvent) => {
        const { type } = event.data;

        if (type === 'heartbeat') {
          this.send('', MESSAGE_TYPES.HEARTBEAT);
        }
      };

      this.heartbeatWorker.onerror = (error) => {
        console.error('Heartbeat worker error:', error);
        // Fallback to setInterval
        this.stopHeartbeatWorker();
        setInterval(() => this.send('', MESSAGE_TYPES.HEARTBEAT), this.HEARTBEAT_INTERVAL);
      };

      // Start the worker
      this.heartbeatWorker.postMessage({
        type: 'start',
        data: { interval: this.HEARTBEAT_INTERVAL }
      });
    } catch (error) {
      console.error('Failed to create heartbeat worker:', error);
      // Fallback to setInterval
      setInterval(() => this.send('', MESSAGE_TYPES.HEARTBEAT), this.HEARTBEAT_INTERVAL);
    }
  }

  /**
   * Stop heartbeat worker
   */
  private stopHeartbeatWorker(): void {
    if (this.heartbeatWorker) {
      this.heartbeatWorker.postMessage({ type: 'stop' });
      this.heartbeatWorker.terminate();
      this.heartbeatWorker = null;
    }
  }

  /**
   * Setup status monitoring based on user activity
   */
  private setupStatusMonitor(): void {
    // Check status periodically
    this.statusCheckInterval = setInterval(() => {
      this.checkAndUpdateStatus();
    }, this.STATUS_CHECK_INTERVAL);

    // Also listen to activity events to update status immediately
    this.activityService.activity$.subscribe(() => {
      this.checkAndUpdateStatus();
    });

    // Check for other users' timeout
    this.checkOtherUsersActivity();
  }

  /**
   * Check and update current user's status
   */
  private checkAndUpdateStatus(): void {
    const userStatus = this.activityService.getUserStatus();

    if (userStatus !== this.currentStatus) {
      this.currentStatus = userStatus;

      if (userStatus === 'afk') {
        this.send('', MESSAGE_TYPES.STATUS_AFK);
      } else {
        this.send('', MESSAGE_TYPES.STATUS_ONLINE);
      }
    }
  }

  /**
   * Check other users' activity and mark as offline if needed
   */
  private checkOtherUsersActivity(): void {
    setInterval(() => {
      const currentTime = Date.now();
      const activity = this.userActivity();
      let updated = false;

      Object.keys(activity).forEach(fingerprint => {
        if (fingerprint === this.userFingerprint) return; // Skip current user

        const lastActive = activity[fingerprint].lastActive;
        const timeSinceActive = currentTime - lastActive;

        if (timeSinceActive > this.OFFLINE_THRESHOLD) {
          if (activity[fingerprint].status !== 'offline') {
            activity[fingerprint].status = 'offline';
            updated = true;
          }
        }
      });

      if (updated) {
        this.userActivity.set({ ...activity });
      }
    }, this.STATUS_CHECK_INTERVAL);
  }

  /**
   * Check if a fingerprint belongs to the current user
   */
  public isCurrentUser(fingerprint: string): boolean {
    return fingerprint === this.userFingerprint;
  }

  /**
   * Get current user's fingerprint
   */
  public getCurrentUserFingerprint(): string {
    return this.userFingerprint;
  }

  /**
   * Get display name for a fingerprint
   */
  public getDisplayName(fingerprint: string): string {
    return this.userNames()[fingerprint] || 'Unknown';
  }

  /**
   * Handle beforeunload event (tab closing)
   */
  private handleBeforeUnload(): void {
    if (this._webSocket) {
      this.send('', MESSAGE_TYPES.USER_LEFT);
    }
  }

  /**
   * Clear all votes (broadcasts to all clients)
   */
  public clearVotes(): void {
    // Send clear votes action to backend (will broadcast to all clients)
    this.send('', MESSAGE_TYPES.CLEAR_VOTES);
    // Also clear the description
    this.send('', MESSAGE_TYPES.DESCRIPTION);
    // Still send the old ClearVotes message for backwards compatibility
    this.send('ClearVotes');
  }

  /**
   * Show all votes (broadcasts to all clients)
   */
  public showVotes(): void {
    this.send('', MESSAGE_TYPES.SHOW_VOTES);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
