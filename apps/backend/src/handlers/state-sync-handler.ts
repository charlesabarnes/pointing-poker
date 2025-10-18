import * as WebSocket from 'ws';
import { Message, ExtWebSocket, MESSAGE_TYPES, SessionState } from 'shared';
import { sendToClient, getSessionClients } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';
import { logger } from '../utils/logger';

/**
 * Handle REQUEST_STATE message type
 * Sends complete session state to the requesting client
 */
export function handleRequestState(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  _message: Message,
  sessionManager: SessionManager
): void {
  const sessionId = extWs.session!;

  logger.info('Client requesting state sync', {
    sessionId,
    clientName: extWs.name,
    fingerprint: extWs.fingerprint
  });

  sendFullState(wss, ws, sessionId, sessionManager);
}

/**
 * Send complete session state to a specific client
 * Used for initial connection and reconnection
 */
export function sendFullState(
  wss: WebSocket.Server,
  client: WebSocket,
  sessionId: string,
  sessionManager: SessionManager
): void {
  // Get all current participants in the session
  const sessionClients = getSessionClients(wss, sessionId);
  const participants = sessionClients
    .filter(c => c.fingerprint) // Only include identified clients
    .map(c => ({
      fingerprint: c.fingerprint!,
      name: c.name || 'Unknown'
    }));

  // Build complete state snapshot
  const state: SessionState = {
    votes: sessionManager.getSessionVotes(sessionId),
    votesRevealed: sessionManager.areVotesRevealed(sessionId),
    description: sessionManager.getDescription(sessionId),
    participants
  };

  // Send as STATE_SYNC message with the state object as content
  sendToClient(
    client,
    'server',
    JSON.stringify(state),
    MESSAGE_TYPES.STATE_SYNC
  );

  logger.debug('Sent full state sync', {
    sessionId,
    votesCount: Object.keys(state.votes).length,
    participantsCount: participants.length,
    votesRevealed: state.votesRevealed,
    hasDescription: !!state.description
  });
}
