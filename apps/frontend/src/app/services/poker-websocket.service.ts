import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Subject, Observable } from 'rxjs';
import { Message, MessageType, UserActivity, PointValues } from 'shared';

@Injectable({
  providedIn: 'root'
})
export class PokerWebSocketService implements OnDestroy {
  private _webSocket: WebSocketSubject<any>;
  private _messageSubject = new Subject<Message>();
  private heartbeatInterval: any;
  private activityInterval: any;

  private sessionId: string;
  private userName: string;

  // Public signals for component state
  public pointValues = signal<PointValues>({});
  public chatLog = signal<Message[]>([]);
  public userActivity = signal<Record<string, UserActivity>>({});
  public lastDescription = signal<string>('');
  public newUserJoined = signal<boolean>(false);
  public recentJoinedUser = signal<string>('');

  // Constants
  private readonly OFFLINE_THRESHOLD = 60000; // 1 minute
  private readonly AWAY_THRESHOLD = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly ACTIVITY_CHECK_INTERVAL = 10000; // 10 seconds

  // Observable stream of all messages
  public messages$: Observable<Message> = this._messageSubject.asObservable();

  constructor() {}

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

    // Send initial message
    this._webSocket.next(new Message(userName, undefined, 'points', sessionId));

    // Setup intervals
    this.setupHeartbeat();
    this.setupActivityMonitor();

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

    const message = new Message(this.userName, content, type, this.sessionId);
    this._webSocket.next(message);
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
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
      activity[sender].status = 'online';
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
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send('', 'heartbeat');
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Setup activity monitoring
   */
  private setupActivityMonitor(): void {
    this.activityInterval = setInterval(() => {
      const currentTime = Date.now();
      const activity = this.userActivity();
      let updated = false;

      Object.keys(activity).forEach(user => {
        const lastActive = activity[user].lastActive;
        const timeSinceActive = currentTime - lastActive;

        if (timeSinceActive > this.OFFLINE_THRESHOLD) {
          if (activity[user].status !== 'offline') {
            activity[user].status = 'offline';
            updated = true;
          }
        } else if (timeSinceActive > this.AWAY_THRESHOLD) {
          if (activity[user].status !== 'away') {
            activity[user].status = 'away';
            updated = true;
          }
        }
      });

      if (updated) {
        this.userActivity.set({ ...activity });
      }
    }, this.ACTIVITY_CHECK_INTERVAL);
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
