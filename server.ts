import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { join } from 'path';

// Express server
const app = express();
const PORT: string | number = process.env.PORT || 4000;
const DIST_FOLDER: string = join(process.cwd(), 'dist/browser');

// Define WebSocket extension interface
interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  session?: string;
  name?: string;
  content?: string | number;
}

// Message class for TypeScript
export class Message {
  public content: string | number;
  public sender: string;
  public type: 'chat' | 'points' | 'action' | 'disconnect' | 'description' | 'heartbeat' | 'join';
  public timestamp: number;

  constructor(
    content: string | number,
    sender: string,
    type: 'chat' | 'points' | 'action' | 'disconnect' | 'description' | 'heartbeat' | 'join',
    timestamp?: number
  ) {
    this.content = content;
    this.sender = sender;
    this.type = type;
    this.timestamp = timestamp || Date.now();
  }
}

// Serve static files from /browser
app.use(express.static(DIST_FOLDER, {
  maxAge: '1y'
}));

// All regular routes use the index.html
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(join(DIST_FOLDER, 'index.html'));
});

// Create message helper
function createMessage(
  content: string | number,
  sender: string = 'NS',
  type: 'chat' | 'points' | 'action' | 'disconnect' | 'description' | 'heartbeat' | 'join',
  timestamp?: number
): string {
  return JSON.stringify(new Message(content, sender, type, timestamp));
}

// Initialize WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // TypeScript fix for req.url
  const url: string = req.url || '/';
  
  // Cast to our extended WebSocket
  const extWs = ws as ExtWebSocket;
  extWs.isAlive = true;
  extWs.session = url.replace('/?session=', '');

  // Send existing point values to new connection
  wss.clients.forEach((client: WebSocket) => {
    const extClient = client as ExtWebSocket;
    if (extClient.session === extWs.session) {
      ws.send(createMessage(extClient.content, extClient.name, 'points'));
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
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage(message.content, message.sender, 'chat', message.timestamp));
            }
          });
        }, 100);
        break;

      case 'description':
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage(message.content, message.sender, 'description', message.timestamp));
            }
          });
        }, 100);
        break;

      case 'heartbeat':
        // Mark client as active
        extWs.isAlive = true;
        console.log(`[Server] Heartbeat received from ${message.sender} in session ${extWs.session}`);
        
        // Broadcast heartbeat to all clients in the session so they know this user is still active
        setTimeout(() => {
          let broadcastCount = 0;
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage('', message.sender, 'heartbeat', message.timestamp));
              broadcastCount++;
            }
          });
          console.log(`[Server] Heartbeat from ${message.sender} broadcast to ${broadcastCount} clients`);
        }, 100);
        break;

      case 'join':
        // Broadcast join message to all clients in the session
        setTimeout(() => {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage(message.content, message.sender, 'join', message.timestamp));
            }
          });
        }, 100);
        break;

      case 'points':
        if (message.content === 'ClearVotes') {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              wss.clients.forEach((connectedClient: WebSocket) => {
                const extConnectedClient = connectedClient as ExtWebSocket;
                if (extClient.session === extConnectedClient.session && 
                    extConnectedClient.content !== 'disconnect') {
                  extConnectedClient.content = undefined;
                  client.send(createMessage(undefined, extConnectedClient.name, 'points'));
                }
              });
            }
          });
        } else if (message.content === 'spectate') {
          wss.clients.forEach((client: WebSocket) => {
            const extClient = client as ExtWebSocket;
            if (extClient.session === extWs.session) {
              client.send(createMessage('disconnect', extWs.name, 'disconnect'));
              extWs.content = 'disconnect';
            }
          });
        } else {
          extWs.content = message.content;
          setTimeout(() => {
            wss.clients.forEach((client: WebSocket) => {
              const extClient = client as ExtWebSocket;
              if (extClient.session === extWs.session) {
                client.send(createMessage(message.content, message.sender, 'points', message.timestamp));
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
      const extClient = client as ExtWebSocket;
      if (extClient.session === extWs.session && ws !== client) {
        client.send(createMessage('disconnect', extWs.name, 'disconnect'));
      }
    });
  });
});

// Check connections every 10 seconds
setInterval(() => {
  console.log(`[Server] Running connection check. Total clients: ${wss.clients.size}`);
  
  wss.clients.forEach((ws: WebSocket) => {
    const extWs = ws as ExtWebSocket;
    
    if (!extWs.isAlive) {
      console.log(`[Server] Client ${extWs.name} in session ${extWs.session} failed ping check - disconnecting`);
      
      wss.clients.forEach((client: WebSocket) => {
        const extClient = client as ExtWebSocket;
        if (extClient.session === extWs.session && ws !== client) {
          client.send(createMessage('disconnect', extWs.name, 'disconnect'));
        }
      });
      
      console.log('client Disconnected');
      return ws.terminate();
    }

    console.log(`[Server] Pinging client ${extWs.name} in session ${extWs.session}`);
    extWs.isAlive = false;
    ws.ping();
  });
}, 10000);

// Start the server
server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});