import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastToSession } from '../utils/broadcast';

/**
 * Handle JOIN message type
 */
export function handleJoin(
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
    'join',
    message.fingerprint
  );
}

/**
 * Handle USER_LEFT message type
 */
export function handleUserLeft(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message
): void {
  // Broadcast user left to all clients in session (exclude sender)
  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'user_left',
    message.fingerprint,
    ws
  );
  // Close the connection
  ws.close();
}
