import * as WebSocket from 'ws';
import { Message, ExtWebSocket, SPECIAL_CONTENT } from 'shared';
import { broadcastToSession, getSessionClients } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * Handle clearing votes (backwards compatibility for old 'ClearVotes' message)
 */
function handleClearVotes(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  sessionManager: SessionManager
): void {
  sessionManager.clearVotes(extWs.session!);

  // Clear content for all connected clients and broadcast
  const sessionClients = getSessionClients(wss, extWs.session!);
  sessionClients.forEach((client) => {
    if (client.content !== SPECIAL_CONTENT.DISCONNECT) {
      client.content = undefined;
    }
  });

  // Broadcast cleared state to all clients
  sessionClients.forEach((client) => {
    broadcastToSession(
      wss,
      extWs.session!,
      client.name || 'Unknown',
      undefined,
      'points',
      client.fingerprint
    );
  });
}

/**
 * Handle user entering spectator mode
 */
function handleSpectate(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket
): void {
  extWs.content = SPECIAL_CONTENT.DISCONNECT;
  broadcastToSession(
    wss,
    extWs.session!,
    extWs.name || 'Unknown',
    SPECIAL_CONTENT.DISCONNECT,
    'disconnect',
    extWs.fingerprint
  );
}

/**
 * Handle vote restoration when a user reconnects
 */
function handleVoteReconnection(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  // Check if this is a reconnection with a stored vote
  if (message.fingerprint && !sessionManager.areVotesRevealed(extWs.session!)) {
    const restoredVote = sessionManager.getVote(extWs.session!, message.fingerprint);
    if (restoredVote !== undefined) {
      // Restore their previous vote
      extWs.content = restoredVote;
      broadcastToSession(
        wss,
        extWs.session!,
        message.sender,
        restoredVote,
        'points',
        message.fingerprint
      );
    }
  }
}

/**
 * Handle regular vote submission
 */
function handleRegularVote(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  // Regular vote - store and broadcast
  extWs.content = message.content;

  if (message.fingerprint) {
    sessionManager.setVote(extWs.session!, message.fingerprint, message.content);
  }

  broadcastToSession(
    wss,
    extWs.session!,
    message.sender,
    message.content,
    'points',
    message.fingerprint
  );
}

/**
 * Main handler for POINTS message type
 */
export function handlePoints(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  if (message.content === SPECIAL_CONTENT.CLEAR_VOTES) {
    // Backwards compatibility: Handle old 'ClearVotes' message
    // TODO: Remove this after all clients are updated to use MESSAGE_TYPES.CLEAR_VOTES
    handleClearVotes(wss, ws, extWs, sessionManager);
  } else if (message.content === SPECIAL_CONTENT.SPECTATE) {
    // User entering spectator mode
    handleSpectate(wss, ws, extWs);
  } else if (message.content === undefined) {
    // Check if this is a reconnection with a stored vote
    handleVoteReconnection(wss, ws, extWs, message, sessionManager);
  } else {
    // Regular vote - store and broadcast
    handleRegularVote(wss, ws, extWs, message, sessionManager);
  }
}
