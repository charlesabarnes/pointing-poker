import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastToSession } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * Handle HEARTBEAT message type
 * Just marks client as active, no broadcast needed
 */
export function handleHeartbeat(
  _wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  sessionManager: SessionManager
): void {
  extWs.isAlive = true;
  extWs.lastActivity = Date.now();
  sessionManager.updateSessionActivity(extWs.session!);
}

/**
 * Handle STATUS_AFK message type
 */
export function handleStatusAfk(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message
): void {
  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'status_afk',
    message.fingerprint
  );
}

/**
 * Handle STATUS_ONLINE message type
 */
export function handleStatusOnline(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message
): void {
  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'status_online',
    message.fingerprint
  );
}
