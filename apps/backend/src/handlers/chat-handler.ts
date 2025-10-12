import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastToSession } from '../utils/broadcast';

/**
 * Handle CHAT message type
 */
export function handleChat(
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
    'chat',
    message.fingerprint
  );
}

/**
 * Handle DESCRIPTION message type
 */
export function handleDescription(
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
    'description',
    message.fingerprint
  );
}
