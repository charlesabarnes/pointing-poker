import * as WebSocket from 'ws';
import { Message, ExtWebSocket, MESSAGE_TYPES } from 'shared';
import { SessionManager } from '../session/session-manager';
import { handleChat, handleDescription } from './chat-handler';
import { handleHeartbeat, handleStatusAfk, handleStatusOnline } from './status-handler';
import { handleJoin, handleUserLeft } from './session-handler';
import { handlePoints } from './points-handler';
import { handleShowVotes, handleClearVotes } from './vote-control-handler';

/**
 * Main message handler that routes messages to appropriate handlers
 */
export function handleMessage(
  wss: WebSocket.Server,
  ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  switch (message.type) {
    case MESSAGE_TYPES.CHAT:
      handleChat(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.DESCRIPTION:
      handleDescription(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.HEARTBEAT:
      handleHeartbeat(wss, ws, extWs, sessionManager);
      break;

    case MESSAGE_TYPES.STATUS_AFK:
      handleStatusAfk(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.STATUS_ONLINE:
      handleStatusOnline(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.USER_LEFT:
      handleUserLeft(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.JOIN:
      handleJoin(wss, ws, extWs, message);
      break;

    case MESSAGE_TYPES.POINTS:
      handlePoints(wss, ws, extWs, message, sessionManager);
      break;

    case MESSAGE_TYPES.SHOW_VOTES:
      handleShowVotes(wss, ws, extWs, message, sessionManager);
      break;

    case MESSAGE_TYPES.CLEAR_VOTES:
      handleClearVotes(wss, ws, extWs, message, sessionManager);
      break;

    default:
      break;
  }
}
