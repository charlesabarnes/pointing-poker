import * as WebSocket from 'ws';
import { Message, ExtWebSocket, MESSAGE_TYPES } from 'shared';
import { SessionManager } from '../session/session-manager';
import { broadcastMessage } from '../utils/broadcast';
import { handleHeartbeat, handleUserLeft } from './connection-handlers';
import { handlePoints, handleShowVotes, handleClearVotes } from './state-handlers';
import { handleRequestState } from './state-sync-handler';
import {
  handleStartTimer,
  handlePauseTimer,
  handleResumeTimer,
  handleStopTimer,
  handleExtendTimer
} from './timer-handlers';

/**
 * Handler function type
 */
type MessageHandler = (
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
) => void;

/**
 * Exception-based message routing
 *
 * Default behavior: Broadcast message to all clients in session (state synchronization)
 *
 * Only these message types need special handling:
 * - HEARTBEAT: No broadcast (just updates activity)
 * - USER_LEFT: Broadcast + close connection
 * - POINTS: Manages server-side vote storage
 * - SHOW_VOTES: Updates session reveal state
 * - CLEAR_VOTES: Clears session vote state
 *
 * All other messages (CHAT, STATUS_AFK, STATUS_ONLINE, JOIN, NAME_CHANGED, etc.)
 * are simply broadcast to synchronize state across clients.
 *
 * DESCRIPTION messages are broadcast AND stored in SessionManager for state sync.
 */
const EXCEPTION_HANDLERS: Partial<Record<string, MessageHandler>> = {
  [MESSAGE_TYPES.HEARTBEAT]: handleHeartbeat,
  [MESSAGE_TYPES.USER_LEFT]: handleUserLeft,
  [MESSAGE_TYPES.POINTS]: handlePoints,
  [MESSAGE_TYPES.SHOW_VOTES]: handleShowVotes,
  [MESSAGE_TYPES.CLEAR_VOTES]: handleClearVotes,
  [MESSAGE_TYPES.REQUEST_STATE]: handleRequestState,
  [MESSAGE_TYPES.START_TIMER]: handleStartTimer,
  [MESSAGE_TYPES.PAUSE_TIMER]: handlePauseTimer,
  [MESSAGE_TYPES.RESUME_TIMER]: handleResumeTimer,
  [MESSAGE_TYPES.STOP_TIMER]: handleStopTimer,
  [MESSAGE_TYPES.EXTEND_TIMER]: handleExtendTimer,
};

/**
 * Main message handler
 * Uses exception-based routing: default is broadcast, only special cases have handlers
 */
export function handleMessage(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  const handler = EXCEPTION_HANDLERS[message.type];

  if (handler) {
    // Special handling required
    handler(wss, ws, extWs, message, sessionManager);
  } else {
    // Default: broadcast to all clients in session for state synchronization
    broadcastMessage(wss, extWs.session!, message);

    // Track description in SessionManager for state sync
    if (message.type === MESSAGE_TYPES.DESCRIPTION && typeof message.content === 'string') {
      sessionManager.setDescription(extWs.session!, message.content);
    }
  }
}
