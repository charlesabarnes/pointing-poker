import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { join } from 'path';
import { Message, MessageType, ExtWebSocket, MESSAGE_TYPES } from 'shared';

// Express server
const app = express();
const PORT: string | number = process.env.PORT || 4000;
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

// Create message helper
function createMessage(
  sender: string = 'NS',
  content: string | number | undefined,
  type: MessageType,
  session?: string,
  timestamp?: number,
  fingerprint?: string
): string {
  return JSON.stringify(new Message(sender, content, type, session, timestamp, fingerprint));
}

// Initialize WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // TypeScript fix for req.url
  const url: string = req.url || '/';

  // Cast to our extended WebSocket
  const extWs = ws as unknown as WebSocket & ExtWebSocket;
  extWs.isAlive = true;
  extWs.session = url.replace('/?session=', '');

  // Send existing point values to new connection
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as unknown as WebSocket & ExtWebSocket;
    if (extClient.session === extWs.session) {
      ws.send(
        createMessage(
          extClient.name,
          extClient.content,
          MESSAGE_TYPES.POINTS,
          undefined,
          undefined,
          extClient.fingerprint
        )
      );
    }
  });

  // Handle pong response
  ws.on('pong', () => {
    extWs.isAlive = true;
  });

  // Handle messages
  ws.on('message', (msg: string) => {
    const message = JSON.parse(msg) as Message;

    // Detect name change (same fingerprint, different name)
    if (extWs.fingerprint === message.fingerprint &&
        extWs.name &&
        extWs.name !== message.sender) {
      console.log(`Name changed: ${extWs.name} -> ${message.sender} (fingerprint: ${message.fingerprint})`);

      // Broadcast name change to all clients in session
      setTimeout(() => {
        wss.clients.forEach((client: WebSocket) => {
          const extClient = client as unknown as WebSocket & ExtWebSocket;
          if (extClient.session === extWs.session) {
            client.send(
              createMessage(
                message.sender,
                message.sender, // new name in content
                MESSAGE_TYPES.NAME_CHANGED,
                undefined,
                Date.now(),
                message.fingerprint
              )
            );
          }
        });
      }, 100);
    }

    extWs.name = message.sender;
    extWs.fingerprint = message.fingerprint;
    extWs.lastActivity = Date.now();

    switch (message.type) {
      case MESSAGE_TYPES.CHAT:
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.CHAT,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.DESCRIPTION:
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.DESCRIPTION,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.HEARTBEAT:
        // Just mark client as active, no need to broadcast
        extWs.isAlive = true;
        extWs.lastActivity = Date.now();
        break;

      case MESSAGE_TYPES.STATUS_AFK:
        // Broadcast AFK status to all clients in session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.STATUS_AFK,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.STATUS_ONLINE:
        // Broadcast online status to all clients in session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.STATUS_ONLINE,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.USER_LEFT:
        // Broadcast user left to all clients in session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session && ws !== client) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.USER_LEFT,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        // Close the connection
        ws.close();
        break;

      case MESSAGE_TYPES.JOIN:
        // Broadcast join message to all clients in the session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.JOIN,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.POINTS:
        if (message.content === 'ClearVotes') {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              wss.clients.forEach((connectedClient: WebSocket) => {
                const extConnectedClient = connectedClient as unknown as WebSocket &
                  ExtWebSocket;
                if (
                  extClient.session === extConnectedClient.session &&
                  extConnectedClient.content !== 'disconnect'
                ) {
                  extConnectedClient.content = undefined;
                  client.send(
                    createMessage(
                      extConnectedClient.name,
                      undefined,
                      MESSAGE_TYPES.POINTS,
                      undefined,
                      undefined,
                      extConnectedClient.fingerprint
                    )
                  );
                }
              });
            }
          });
        } else if (message.content === 'spectate') {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  extWs.name,
                  'disconnect',
                  MESSAGE_TYPES.DISCONNECT,
                  undefined,
                  undefined,
                  extWs.fingerprint
                )
              );
              extWs.content = 'disconnect';
            }
          });
        } else {
          extWs.content = message.content;
          setTimeout(() => {
            wss.clients.forEach((client: WebSocket) => {
              const extClient = client as unknown as WebSocket & ExtWebSocket;
              if (extClient.session === extWs.session) {
                client.send(
                  createMessage(
                    message.sender,
                    message.content,
                    MESSAGE_TYPES.POINTS,
                    undefined,
                    message.timestamp,
                    message.fingerprint
                  )
                );
              }
            });
          }, 100);
        }
        break;

      case MESSAGE_TYPES.SHOW_VOTES:
        // Broadcast show votes action to all clients in session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.SHOW_VOTES,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      case MESSAGE_TYPES.CLEAR_VOTES:
        // Broadcast clear votes action to all clients in session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  MESSAGE_TYPES.CLEAR_VOTES,
                  undefined,
                  message.timestamp,
                  message.fingerprint
                )
              );
            }
          });
        }, 100);
        break;

      default:
        break;
    }
  });

  // Handle errors
  ws.on('error', () => {
    wss.clients.forEach((client: WebSocket) => {
      const extClient = client as unknown as WebSocket & ExtWebSocket;
      if (extClient.session === extWs.session && ws !== client) {
        client.send(
          createMessage(
            extWs.name,
            'disconnect',
            MESSAGE_TYPES.DISCONNECT,
            undefined,
            undefined,
            extWs.fingerprint
          )
        );
      }
    });
  });
});

// Check connections every 30 seconds for better performance
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds
const INACTIVITY_TIMEOUT = 3600000; // 1 hour

setInterval(() => {
  const now = Date.now();

  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as unknown as WebSocket & ExtWebSocket;

    // Check for ping/pong timeout (connection alive check)
    if (!extWs.isAlive) {
      wss.clients.forEach((client: WebSocket) => {
        const extClient = client as unknown as WebSocket & ExtWebSocket;
        if (extClient.session === extWs.session && ws !== client) {
          client.send(
            createMessage(
              extWs.name,
              'disconnect',
              MESSAGE_TYPES.DISCONNECT,
              undefined,
              undefined,
              extWs.fingerprint
            )
          );
        }
      });

      console.log(`Client disconnected (no pong): ${extWs.name}`);
      return ws.terminate();
    }

    // Check for inactivity timeout (1 hour)
    if (extWs.lastActivity && now - extWs.lastActivity > INACTIVITY_TIMEOUT) {
      wss.clients.forEach((client: WebSocket) => {
        const extClient = client as unknown as WebSocket & ExtWebSocket;
        if (extClient.session === extWs.session && ws !== client) {
          client.send(
            createMessage(
              extWs.name,
              'timeout',
              MESSAGE_TYPES.DISCONNECT,
              undefined,
              undefined,
              extWs.fingerprint
            )
          );
        }
      });

      console.log(`Client disconnected (timeout): ${extWs.name}`);
      return ws.terminate();
    }

    extWs.isAlive = false;
    ws.ping();
  });
}, CONNECTION_CHECK_INTERVAL);

// Start the server
server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
