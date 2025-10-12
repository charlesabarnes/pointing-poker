import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastToSession } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * Handle SHOW_VOTES message type
 */
export function handleShowVotes(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  // Mark session as revealed (votes shown)
  sessionManager.revealVotes(extWs.session!);

  // Broadcast show votes action to all clients in session
  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'show_votes',
    message.fingerprint
  );
}

/**
 * Handle CLEAR_VOTES message type
 */
export function handleClearVotes(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  // Clear persistent vote storage for this session
  sessionManager.clearVotes(extWs.session!);

  // Broadcast clear votes action to all clients in session
  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'clear_votes',
    message.fingerprint
  );
}
