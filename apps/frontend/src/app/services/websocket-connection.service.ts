import { Injectable, signal, OnDestroy } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Subject } from 'rxjs';
import { Message } from 'shared';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketConnectionService implements OnDestroy {
  private webSocket: WebSocketSubject<Message> | null = null;
  private reconnectTimeout: any;
  private reconnectAttempts = 0;

  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_BASE_DELAY = 1000;
  private readonly MAX_RECONNECT_DELAY = 30000;

  private _messages$ = new Subject<Message>();
  public readonly messages$ = this._messages$.asObservable();

  public connectionState = signal<ConnectionState>(ConnectionState.DISCONNECTED);

  private url: string;

  connect(url: string): void {
    this.url = url;
    this.reconnectAttempts = 0;
    this.createWebSocketConnection();
  }

  private createWebSocketConnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const isReconnecting = this.reconnectAttempts > 0;
    this.connectionState.set(isReconnecting ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING);

    try {
      this.webSocket = webSocket<Message>({
        url: this.url,
        closeObserver: {
          next: () => this.handleConnectionClosed()
        },
        openObserver: {
          next: () => this.handleConnectionOpened()
        }
      });

      this.webSocket.subscribe({
        next: (message: Message) => this._messages$.next(message),
        error: (err) => this.handleConnectionError(err),
        complete: () => this.handleConnectionClosed()
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleConnectionError(error);
    }
  }

  private handleConnectionOpened(): void {
    console.log('WebSocket connection opened');
    this.reconnectAttempts = 0;
    this.connectionState.set(ConnectionState.CONNECTED);
  }

  private handleConnectionError(error: any): void {
    console.error('WebSocket error:', error);
    this.connectionState.set(ConnectionState.ERROR);
    this.attemptReconnect();
  }

  private handleConnectionClosed(): void {
    console.log('WebSocket connection closed');
    this.connectionState.set(ConnectionState.ERROR);
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.connectionState.set(ConnectionState.ERROR);
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.connectionState.set(ConnectionState.RECONNECTING);

    const delay = Math.min(
      this.RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      this.MAX_RECONNECT_DELAY
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimeout = setTimeout(() => {
      this.createWebSocketConnection();
    }, delay);
  }

  sendRaw(message: Message): void {
    if (!this.webSocket) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      this.webSocket.next(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  disconnect(): void {
    this.connectionState.set(ConnectionState.DISCONNECTED);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.webSocket) {
      this.webSocket.complete();
      this.webSocket = null;
    }
  }

  isConnected(): boolean {
    return this.connectionState() === ConnectionState.CONNECTED;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._messages$.complete();
  }
}
