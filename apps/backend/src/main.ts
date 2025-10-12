import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { join } from 'path';
import { Message, MessageType, ExtWebSocket, MESSAGE_TYPES, SPECIAL_CONTENT } from 'shared';
import { broadcastToSession, sendToClient, getSessionClients } from './utils/broadcast';
import { SessionManager } from './session/session-manager';
import { loadConfig, validateConfig } from './config/environment';
import { logger } from './utils/logger';

// Load and validate configuration
const config = loadConfig();
validateConfig(config);
logger.setLevel(config.logLevel);

// Express server
const app = express();
const DIST_FOLDER: string = join(process.cwd(), 'dist/apps/frontend/browser');

// Serve static files from /browser
app.use(
  express.static(DIST_FOLDER, {
    maxAge: '1y',
  })
);

// All regular routes use the index.html
app.get('/*path', (req: express.Request, res: express.Response) => {
  res.sendFile(join(DIST_FOLDER, 'index.html'));
});

// Initialize WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize session manager
const sessionManager = new SessionManager();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // TypeScript fix for req.url
  const url: string = req.url || '/';

  // Cast to our extended WebSocket
  const extWs = ws as unknown as WebSocket & ExtWebSocket;
  extWs.isAlive = true;
  extWs.session = url.replace('/?session=', '');
  extWs.lastActivity = Date.now();

  // Update session activity
  sessionManager.updateSessionActivity(extWs.session);

  // Log connection
  logger.logConnection(extWs.session);

  // Send existing point values to new connection
  const sessionClients = getSessionClients(wss, extWs.session);
  sessionClients.forEach((client) => {
    sendToClient(
      ws,
      client.name || 'Unknown',
      client.content,
      MESSAGE_TYPES.POINTS,
      client.fingerprint
    );
  });

  // Send revealed state to new connection if votes are already shown
  if (sessionManager.areVotesRevealed(extWs.session)) {
    sendToClient(ws, 'server', 'votes_revealed', MESSAGE_TYPES.SHOW_VOTES);
  }

  // Handle pong response
  ws.on('pong', () => {
    extWs.isAlive = true;
  });

  // Handle messages
  ws.on('message', (msg: string) => {
    const message = JSON.parse(msg) as Message;

    // Log message
    logger.logMessage(message.type, extWs.session, message.sender);

    // Detect name change (same fingerprint, different name)
    if (extWs.fingerprint === message.fingerprint &&
        extWs.name &&
        extWs.name !== message.sender) {
      logger.info('User changed name', {
        oldName: extWs.name,
        newName: message.sender,
        fingerprint: message.fingerprint,
        sessionId: extWs.session
      });

      // Broadcast name change to all clients in session
      broadcastToSession(
        wss,
        extWs.session,
        message.sender,
        message.sender, // new name in content
        MESSAGE_TYPES.NAME_CHANGED,
        message.fingerprint
      );
    }

    extWs.name = message.sender;
    extWs.fingerprint = message.fingerprint;
    extWs.lastActivity = Date.now();
    sessionManager.updateSessionActivity(extWs.session);

    switch (message.type) {
      case MESSAGE_TYPES.CHAT:
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.CHAT,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.DESCRIPTION:
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.DESCRIPTION,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.HEARTBEAT:
        // Just mark client as active, no need to broadcast
        extWs.isAlive = true;
        extWs.lastActivity = Date.now();
        sessionManager.updateSessionActivity(extWs.session);
        break;

      case MESSAGE_TYPES.STATUS_AFK:
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.STATUS_AFK,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.STATUS_ONLINE:
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.STATUS_ONLINE,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.USER_LEFT:
        // Broadcast user left to all clients in session (exclude sender)
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.USER_LEFT,
          message.fingerprint,
          ws
        );
        // Close the connection
        ws.close();
        break;

      case MESSAGE_TYPES.JOIN:
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.JOIN,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.POINTS:
        if (message.content === SPECIAL_CONTENT.CLEAR_VOTES) {
          // Backwards compatibility: Handle old 'ClearVotes' message
          // TODO: Remove this after all clients are updated to use MESSAGE_TYPES.CLEAR_VOTES
          sessionManager.clearVotes(extWs.session);

          // Clear content for all connected clients and broadcast
          const sessionClients = getSessionClients(wss, extWs.session);
          sessionClients.forEach((client) => {
            if (client.content !== SPECIAL_CONTENT.DISCONNECT) {
              client.content = undefined;
            }
          });

          // Broadcast cleared state to all clients
          sessionClients.forEach((client) => {
            broadcastToSession(
              wss,
              extWs.session,
              client.name || 'Unknown',
              undefined,
              MESSAGE_TYPES.POINTS,
              client.fingerprint
            );
          });
        } else if (message.content === SPECIAL_CONTENT.SPECTATE) {
          // User entering spectator mode
          extWs.content = SPECIAL_CONTENT.DISCONNECT;
          broadcastToSession(
            wss,
            extWs.session,
            extWs.name || 'Unknown',
            SPECIAL_CONTENT.DISCONNECT,
            MESSAGE_TYPES.DISCONNECT,
            extWs.fingerprint
          );
        } else if (message.content === undefined) {
          // Check if this is a reconnection with a stored vote
          if (message.fingerprint && !sessionManager.areVotesRevealed(extWs.session)) {
            const restoredVote = sessionManager.getVote(extWs.session, message.fingerprint);
            if (restoredVote !== undefined) {
              // Restore their previous vote
              extWs.content = restoredVote;
              broadcastToSession(
                wss,
                extWs.session,
                message.sender,
                restoredVote,
                MESSAGE_TYPES.POINTS,
                message.fingerprint
              );
            }
          }
        } else {
          // Regular vote - store and broadcast
          extWs.content = message.content;

          if (message.fingerprint) {
            sessionManager.setVote(extWs.session, message.fingerprint, message.content);
          }

          broadcastToSession(
            wss,
            extWs.session,
            message.sender,
            message.content,
            MESSAGE_TYPES.POINTS,
            message.fingerprint
          );
        }
        break;

      case MESSAGE_TYPES.SHOW_VOTES:
        // Mark session as revealed (votes shown)
        sessionManager.revealVotes(extWs.session);

        // Broadcast show votes action to all clients in session
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.SHOW_VOTES,
          message.fingerprint
        );
        break;

      case MESSAGE_TYPES.CLEAR_VOTES:
        // Clear persistent vote storage for this session
        sessionManager.clearVotes(extWs.session);

        // Broadcast clear votes action to all clients in session
        broadcastToSession(
          wss,
          extWs.session,
          message.sender,
          message.content,
          MESSAGE_TYPES.CLEAR_VOTES,
          message.fingerprint
        );
        break;

      default:
        break;
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.logWebSocketError(extWs.session, extWs.name, error as Error);
    broadcastToSession(
      wss,
      extWs.session,
      extWs.name || 'Unknown',
      SPECIAL_CONTENT.DISCONNECT,
      MESSAGE_TYPES.DISCONNECT,
      extWs.fingerprint,
      ws
    );
  });
});

// Check connections periodically using configuration values
setInterval(() => {
  const now = Date.now();

  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as unknown as WebSocket & ExtWebSocket;

    // Check for ping/pong timeout (connection alive check)
    if (!extWs.isAlive) {
      broadcastToSession(
        wss,
        extWs.session,
        extWs.name || 'Unknown',
        SPECIAL_CONTENT.DISCONNECT,
        MESSAGE_TYPES.DISCONNECT,
        extWs.fingerprint,
        ws
      );

      logger.logDisconnect(extWs.session, extWs.name, 'no pong');
      return ws.terminate();
    }

    // Check for inactivity timeout
    if (extWs.lastActivity && now - extWs.lastActivity > config.inactivityTimeout) {
      broadcastToSession(
        wss,
        extWs.session,
        extWs.name || 'Unknown',
        SPECIAL_CONTENT.TIMEOUT,
        MESSAGE_TYPES.DISCONNECT,
        extWs.fingerprint,
        ws
      );

      logger.logDisconnect(extWs.session, extWs.name, 'timeout');
      return ws.terminate();
    }

    extWs.isAlive = false;
    ws.ping();
  });
}, config.connectionCheckInterval);

// Clean up inactive sessions periodically to prevent memory leaks
setInterval(() => {
  const cleanedCount = sessionManager.cleanupInactiveSessions(config.sessionInactivityThreshold);
  if (cleanedCount > 0) {
    const stats = sessionManager.getStats();
    logger.logSessionCleanup(cleanedCount, stats.activeSessions);
    logger.debug('Session stats', {
      activeSessions: stats.activeSessions,
      totalVotes: stats.totalVotes,
      revealedSessions: stats.revealedSessions
    });
  }
}, config.sessionCleanupInterval);

// Start the server
server.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    nodeEnv: config.nodeEnv,
    logLevel: config.logLevel
  });
  logger.info(`Serving static files from: ${DIST_FOLDER}`);
});
