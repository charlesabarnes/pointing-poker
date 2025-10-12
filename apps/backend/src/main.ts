import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { join } from 'path';
import { Message, ExtWebSocket, MESSAGE_TYPES, SPECIAL_CONTENT } from 'shared';
import { broadcastToSession, sendToClient, getSessionClients } from './utils/broadcast';
import { SessionManager } from './session/session-manager';
import { loadConfig, validateConfig } from './config/environment';
import { logger } from './utils/logger';
import { handleMessage } from './handlers/message-handlers';
import { handleNameChange } from './utils/name-change';

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
app.get('/*path', (_req: express.Request, res: express.Response) => {
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
  // Exclude clients without fingerprints (not yet identified)
  const sessionClients = getSessionClients(wss, extWs.session);
  sessionClients.forEach((client) => {
    // Only send state for clients that have been properly identified
    if (client.fingerprint) {
      sendToClient(
        ws,
        client.name || 'Unknown',
        client.content,
        MESSAGE_TYPES.POINTS,
        client.fingerprint
      );
    }
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

    // Detect and handle name change
    handleNameChange(wss, extWs, message);

    // Update WebSocket state
    extWs.name = message.sender;
    extWs.fingerprint = message.fingerprint;
    extWs.lastActivity = Date.now();
    sessionManager.updateSessionActivity(extWs.session);

    // Route message to appropriate handler
    handleMessage(wss, ws, extWs, message, sessionManager);
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
