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
import { sendFullState } from './handlers/state-sync-handler';
import { TimerService } from './utils/timer-service';
import { setTimerService } from './handlers/timer-handlers';

const config = loadConfig();
validateConfig(config);
logger.setLevel(config.logLevel);

const app = express();
const DIST_FOLDER: string = join(process.cwd(), 'dist/apps/frontend/browser');

app.use(
  express.static(DIST_FOLDER, {
    maxAge: '1y',
  })
);

app.get('/*path', (_req: express.Request, res: express.Response) => {
  res.sendFile(join(DIST_FOLDER, 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessionManager = new SessionManager();
const timerService = new TimerService(wss, sessionManager);
setTimerService(timerService);

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // TypeScript fix for req.url
  const url: string = req.url || '/';

  // Cast to our extended WebSocket
  const extWs = ws as unknown as WebSocket & ExtWebSocket;
  extWs.isAlive = true;
  extWs.session = url.replace('/?session=', '');
  extWs.lastActivity = Date.now();
  extWs.missedHeartbeats = 0;
  extWs.lastHeartbeat = Date.now();
  extWs.offlineSince = undefined;

  // Update session activity
  sessionManager.updateSessionActivity(extWs.session);

  // Log connection
  logger.logConnection(extWs.session);

  // Send complete session state to new connection
  // This includes: votes, reveal status, description, and participants
  // Timeout allows the client to identify itself first
  setTimeout(() => {
    sendFullState(wss, ws, extWs.session, sessionManager);
  }, 100);

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

    // Check for missed heartbeats
    const timeSinceLastHeartbeat = now - extWs.lastHeartbeat;
    const heartbeatThreshold = config.heartbeatInterval * 1.5; // Allow 1.5x tolerance

    if (timeSinceLastHeartbeat > heartbeatThreshold) {
      extWs.missedHeartbeats++;

      // Mark user as offline after threshold reached
      if (extWs.missedHeartbeats >= config.missedHeartbeatThreshold && !extWs.offlineSince) {
        extWs.offlineSince = now;

        // Broadcast offline status (keep user in session, just update status)
        if (extWs.session && extWs.fingerprint) {
          broadcastToSession(
            wss,
            extWs.session,
            extWs.name || 'Unknown',
            '',
            MESSAGE_TYPES.STATUS_OFFLINE,
            extWs.fingerprint,
            ws
          );

          logger.info(`User marked offline due to missed heartbeats`, {
            session: extWs.session,
            name: extWs.name,
            fingerprint: extWs.fingerprint,
            missedHeartbeats: extWs.missedHeartbeats
          });
        }
      }
    }

    // Check if offline user should be removed (after 5 minutes)
    if (extWs.offlineSince && now - extWs.offlineSince > config.offlineRemovalTimeout) {
      broadcastToSession(
        wss,
        extWs.session,
        extWs.name || 'Unknown',
        SPECIAL_CONTENT.DISCONNECT,
        MESSAGE_TYPES.DISCONNECT,
        extWs.fingerprint,
        ws
      );

      logger.logDisconnect(extWs.session, extWs.name, 'offline timeout');
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
