import * as WebSocket from 'ws';
import { Message, ExtWebSocket, MESSAGE_TYPES } from 'shared';
import { broadcastMessage } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * Connection handlers - these have special connection behavior
 * (no broadcast, or broadcast + close connection)
 */

/**
 * Handle HEARTBEAT message type
 * Resets missed heartbeat counter and handles auto-recovery from offline status
 */
export function handleHeartbeat(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  const now = Date.now();
  const wasOffline = extWs.offlineSince !== undefined;

  extWs.isAlive = true;
  extWs.lastActivity = now;
  extWs.lastHeartbeat = now;
  extWs.missedHeartbeats = 0;
  extWs.offlineSince = undefined;

  sessionManager.updateSessionActivity(extWs.session!);

  // If user was offline, broadcast auto-recovery to online status
  if (wasOffline && extWs.session && extWs.fingerprint) {
    const recoveryMessage = new Message(
      extWs.name || 'Unknown',
      '',
      MESSAGE_TYPES.STATUS_ONLINE,
      extWs.session,
      now,
      extWs.fingerprint
    );
    broadcastMessage(wss, extWs.session, recoveryMessage);
  }
}

/**
 * Handle USER_LEFT message type
 * Broadcasts the leave message then closes the connection
 */
export function handleUserLeft(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  _sessionManager: SessionManager
): void {
  // Broadcast user left to all clients in session (exclude sender)
  broadcastMessage(wss, extWs.session!, message, ws);

  // Close the connection
  ws.close();
}
