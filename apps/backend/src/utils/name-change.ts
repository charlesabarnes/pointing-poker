import * as WebSocket from 'ws';
import { Message, ExtWebSocket, MESSAGE_TYPES } from 'shared';
import { broadcastToSession } from './broadcast';
import { logger } from './logger';

/**
 * Detect and handle name changes
 * Returns true if a name change was detected and handled
 */
export function handleNameChange(
  wss: WebSocket.Server,
  extWs: WebSocket & ExtWebSocket,
  message: Message
): boolean {
  // Detect name change (same fingerprint, different name)
  if (
    extWs.fingerprint === message.fingerprint &&
    extWs.name &&
    extWs.name !== message.sender
  ) {
    logger.info('User changed name', {
      oldName: extWs.name,
      newName: message.sender,
      fingerprint: message.fingerprint,
      sessionId: extWs.session
    });

    // Broadcast name change to all clients in session
    broadcastToSession(
      wss,
      extWs.session!,
      message.sender,
      message.sender, // new name in content
      MESSAGE_TYPES.NAME_CHANGED,
      message.fingerprint
    );

    return true;
  }

  return false;
}
