import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { join } from 'path';
import { Message, MessageType, ExtWebSocket } from 'shared';

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
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(join(DIST_FOLDER, 'index.html'));
});

// Create message helper
function createMessage(
  sender: string = 'NS',
  content: string | number | undefined,
  type: MessageType,
  session?: string,
  timestamp?: number
): string {
  return JSON.stringify(new Message(sender, content, type, session, timestamp));
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
      ws.send(createMessage(extClient.name, extClient.content, 'points'));
    }
  });

  // Handle pong response
  ws.on('pong', () => {
    extWs.isAlive = true;
  });

  // Handle messages
  ws.on('message', (msg: string) => {
    const message = JSON.parse(msg) as Message;
    extWs.name = message.sender;

    switch (message.type) {
      case 'chat':
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  'chat',
                  undefined,
                  message.timestamp
                )
              );
            }
          });
        }, 100);
        break;

      case 'description':
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  'description',
                  undefined,
                  message.timestamp
                )
              );
            }
          });
        }, 100);
        break;

      case 'heartbeat':
        // Just mark client as active, no need to broadcast
        extWs.isAlive = true;
        break;

      case 'join':
        // Broadcast join message to all clients in the session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(
                createMessage(
                  message.sender,
                  message.content,
                  'join',
                  undefined,
                  message.timestamp
                )
              );
            }
          });
        }, 100);
        break;

      case 'points':
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
                    createMessage(extConnectedClient.name, undefined, 'points')
                  );
                }
              });
            }
          });
        } else if (message.content === 'spectate') {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as unknown as WebSocket & ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage(extWs.name, 'disconnect', 'disconnect'));
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
                    'points',
                    undefined,
                    message.timestamp
                  )
                );
              }
            });
          }, 100);
        }
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
        client.send(createMessage(extWs.name, 'disconnect', 'disconnect'));
      }
    });
  });
});

// Check connections every 10 seconds
setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as unknown as WebSocket & ExtWebSocket;

    if (!extWs.isAlive) {
      wss.clients.forEach((client: WebSocket) => {
        const extClient = client as unknown as WebSocket & ExtWebSocket;
        if (extClient.session === extWs.session && ws !== client) {
          client.send(createMessage(extWs.name, 'disconnect', 'disconnect'));
        }
      });

      console.log('client Disconnected');
      return ws.terminate();
    }

    extWs.isAlive = false;
    ws.ping();
  });
}, 10000);

// Start the server
server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
