import * as WebSocket from 'ws';
import { ExtWebSocket, Message, MessageType } from 'shared';
import { logger } from './logger';

/**
 * Broadcast a message to all clients in a specific session
 * @param wss - WebSocket server instance
 * @param sessionId - The session ID to broadcast to
 * @param sender - The sender name
 * @param content - The message content
 * @param type - The message type
 * @param fingerprint - Optional fingerprint
 * @param excludeSender - Optional WebSocket to exclude from broadcast (usually the sender)
 */
export function broadcastToSession(
  wss: WebSocket.Server,
  sessionId: string,
  sender: string,
  content: string | number | undefined,
  type: MessageType,
  fingerprint?: string,
  excludeSender?: WebSocket
): void {
  const message = JSON.stringify(
    new Message(sender, content, type, undefined, Date.now(), fingerprint)
  );

  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as unknown as WebSocket & ExtWebSocket;
    if (extClient.session === sessionId && client !== excludeSender) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          logger.error(
            'Failed to send message to client',
            error instanceof Error ? error : new Error(String(error)),
            {
              sessionId,
              clientName: extClient.name
            }
          );
        }
      } else {
        logger.debug('Skipping client with non-OPEN readyState', {
          sessionId,
          clientName: extClient.name,
          readyState: client.readyState
        });
      }
    }
  });
}

/**
 * Send a message to a specific client
 * @param client - The WebSocket client
 * @param sender - The sender name
 * @param content - The message content
 * @param type - The message type
 * @param fingerprint - Optional fingerprint
 */
export function sendToClient(
  client: WebSocket,
  sender: string,
  content: string | number | undefined,
  type: MessageType,
  fingerprint?: string
): void {
  const message = JSON.stringify(
    new Message(sender, content, type, undefined, Date.now(), fingerprint)
  );

  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(message);
    } catch (error) {
      const extClient = client as unknown as WebSocket & ExtWebSocket;
      logger.error(
        'Failed to send message to specific client',
        error instanceof Error ? error : new Error(String(error)),
        {
          clientName: extClient.name,
          clientSession: extClient.session
        }
      );
    }
  } else {
    const extClient = client as unknown as WebSocket & ExtWebSocket;
    logger.debug('Cannot send to client with non-OPEN readyState', {
      clientName: extClient.name,
      readyState: client.readyState
    });
  }
}

/**
 * Get all clients in a specific session
 * @param wss - WebSocket server instance
 * @param sessionId - The session ID
 * @returns Array of WebSocket clients in the session
 */
export function getSessionClients(
  wss: WebSocket.Server,
  sessionId: string
): (WebSocket & ExtWebSocket)[] {
  const clients: (WebSocket & ExtWebSocket)[] = [];
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as unknown as WebSocket & ExtWebSocket;
    if (extClient.session === sessionId) {
      clients.push(extClient);
    }
  });
  return clients;
}

/**
 * Broadcast a complete message object to all clients in a session
 * This is simpler than broadcastToSession as it doesn't reconstruct the message
 * @param wss - WebSocket server instance
 * @param sessionId - The session ID to broadcast to
 * @param message - The complete message to broadcast
 * @param excludeSender - Optional WebSocket to exclude from broadcast (usually the sender)
 */
export function broadcastMessage(
  wss: WebSocket.Server,
  sessionId: string,
  message: Message,
  excludeSender?: WebSocket
): void {
  const messageStr = JSON.stringify(message);

  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as unknown as WebSocket & ExtWebSocket;
    if (extClient.session === sessionId && client !== excludeSender) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          logger.error(
            'Failed to broadcast message to client',
            error instanceof Error ? error : new Error(String(error)),
            {
              sessionId,
              clientName: extClient.name,
              messageType: message.type
            }
          );
        }
      } else {
        logger.debug('Skipping client with non-OPEN readyState during broadcast', {
          sessionId,
          clientName: extClient.name,
          readyState: client.readyState
        });
      }
    }
  });
}
