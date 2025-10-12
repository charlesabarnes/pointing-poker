import * as WebSocket from 'ws';
import { ExtWebSocket, Message, MessageType } from 'shared';

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
      client.send(message);
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
  client.send(message);
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
