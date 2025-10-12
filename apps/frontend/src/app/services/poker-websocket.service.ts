import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Subject, Observable } from 'rxjs';
import { Message, MessageType, UserActivity, PointValues } from 'shared';
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
  public pointValues = signal<PointValues>({});
  public chatLog = signal<Message[]>([]);
  public userActivity = signal<Record<string, UserActivity>>({});
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
      this.send('has joined the session', 'join');
    }, 1000);
  }

  /**
   * Send a message through the WebSocket
   */
  public send(content: string | number, type: MessageType = 'points'): void {
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

    // Emit message to subscribers
    this._messageSubject.next(res);

    // Update user activity
    this.updateUserActivity(res.sender, res.timestamp);

    // Handle different message types
    switch (res.type) {
      case 'disconnect':
      case 'user_left':
        this.handleDisconnect(res.sender);
        break;
      case 'points':
        this.handlePoints(res.sender, res.content);
        break;
      case 'chat':
        this.handleChat(res);
        break;
      case 'description':
        this.handleDescription(res.content as string);
        break;
      case 'heartbeat':
        // Activity already updated above
        break;
      case 'status_afk':
        this.updateUserStatus(res.sender, 'afk', res.timestamp);
        break;
      case 'status_online':
        this.updateUserStatus(res.sender, 'online', res.timestamp);
        break;
      case 'join':
        this.handleJoin(res);
        break;
      default:
        break;
    }
  }

  /**
   * Update user activity tracking
   */
  private updateUserActivity(sender: string, timestamp?: number): void {
    const activity = this.userActivity();
    const currentTime = timestamp || Date.now();

    if (!activity[sender]) {
      activity[sender] = {
        lastActive: currentTime,
        status: 'online'
      };
    } else {
      activity[sender].lastActive = currentTime;
      // Only update to online if not explicitly set to another status
      if (activity[sender].status === 'offline') {
        activity[sender].status = 'online';
      }
    }

    this.userActivity.set({ ...activity });
  }

  /**
   * Update user status (for AFK/online state changes)
   */
  private updateUserStatus(sender: string, status: 'online' | 'afk', timestamp?: number): void {
    const activity = this.userActivity();
    const currentTime = timestamp || Date.now();

    if (!activity[sender]) {
      activity[sender] = {
        lastActive: currentTime,
        status: status
      };
    } else {
      activity[sender].lastActive = currentTime;
      activity[sender].status = status;
    }

    this.userActivity.set({ ...activity });
  }

  /**
   * Handle disconnect message
   */
  private handleDisconnect(sender: string): void {
    const points = this.pointValues();
    delete points[sender];
    this.pointValues.set({ ...points });

    const activity = this.userActivity();
    if (activity[sender]) {
      activity[sender].status = 'offline';
      this.userActivity.set({ ...activity });
    }
  }

  /**
   * Handle points message
   */
  private handlePoints(sender: string, content: string | number | undefined): void {
    const points = this.pointValues();
    points[sender] = content;
    this.pointValues.set({ ...points });
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
      setInterval(() => this.send('', 'heartbeat'), this.HEARTBEAT_INTERVAL);
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
          this.send('', 'heartbeat');
        }
      };

      this.heartbeatWorker.onerror = (error) => {
        console.error('Heartbeat worker error:', error);
        // Fallback to setInterval
        this.stopHeartbeatWorker();
        setInterval(() => this.send('', 'heartbeat'), this.HEARTBEAT_INTERVAL);
      };

      // Start the worker
      this.heartbeatWorker.postMessage({
        type: 'start',
        data: { interval: this.HEARTBEAT_INTERVAL }
      });
    } catch (error) {
      console.error('Failed to create heartbeat worker:', error);
      // Fallback to setInterval
      setInterval(() => this.send('', 'heartbeat'), this.HEARTBEAT_INTERVAL);
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
        this.send('', 'status_afk');
      } else {
        this.send('', 'status_online');
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

      Object.keys(activity).forEach(user => {
        if (user === this.userName) return; // Skip current user

        const lastActive = activity[user].lastActive;
        const timeSinceActive = currentTime - lastActive;

        if (timeSinceActive > this.OFFLINE_THRESHOLD) {
          if (activity[user].status !== 'offline') {
            activity[user].status = 'offline';
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
   * Handle beforeunload event (tab closing)
   */
  private handleBeforeUnload(): void {
    if (this._webSocket) {
      this.send('', 'user_left');
    }
  }

  /**
   * Clear all votes
   */
  public clearVotes(): void {
    this.send('ClearVotes');
    this.send('', 'description');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
