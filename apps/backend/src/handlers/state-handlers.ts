import * as WebSocket from 'ws';
import { Message, ExtWebSocket, SPECIAL_CONTENT } from 'shared';
import { broadcastToSession, broadcastMessage, getSessionClients } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

/**
 * State handlers - these manage server-side state (votes, revealed status)
 * All other message types are just broadcasts for client synchronization
 */

/**
 * Handle POINTS message type
 * Points messages have special logic for:
 * - Vote storage/restoration
 * - Spectate mode
 * - Backwards compatibility with old ClearVotes
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
    handleLegacyClearVotes(wss, extWs, sessionManager);
  } else if (message.content === SPECIAL_CONTENT.SPECTATE) {
    // User entering spectator mode
    extWs.content = SPECIAL_CONTENT.DISCONNECT;
    broadcastToSession(
      wss,
      extWs.session!,
      extWs.name || 'Unknown',
      SPECIAL_CONTENT.DISCONNECT,
      'disconnect',
      extWs.fingerprint
    );
  } else if (message.content === undefined) {
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
  } else {
    // Regular vote - store and broadcast
    extWs.content = message.content;

    if (message.fingerprint) {
      sessionManager.setVote(extWs.session!, message.fingerprint, message.content);
    }

    broadcastMessage(wss, extWs.session!, message);
  }
}

/**
 * Handle SHOW_VOTES message type
 * Updates session state to mark votes as revealed
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
  broadcastMessage(wss, extWs.session!, message);
}

/**
 * Handle CLEAR_VOTES message type
 * Clears all votes in the session
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
  broadcastMessage(wss, extWs.session!, message);
}

/**
 * Legacy handler for old ClearVotes special content
 * TODO: Remove after migration complete
 */
function handleLegacyClearVotes(
  wss: WebSocket.Server,
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
