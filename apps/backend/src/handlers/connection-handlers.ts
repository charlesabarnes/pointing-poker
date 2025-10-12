import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastMessage } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * Connection handlers - these have special connection behavior
 * (no broadcast, or broadcast + close connection)
 */

/**
 * Handle HEARTBEAT message type
 * Just marks client as active, no broadcast needed
 */
export function handleHeartbeat(
  _wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  _message: Message,
  sessionManager: SessionManager
): void {
  extWs.isAlive = true;
  extWs.lastActivity = Date.now();
  sessionManager.updateSessionActivity(extWs.session!);
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
