import 'zone.js/dist/zone-node';
import {enableProdMode} from '@angular/core';
// Express Engine
import { AppServerModule } from './src/app/app.server.module';
import { readFileSync } from 'fs';
(global as any).XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

import * as http from 'http';
import * as express from 'express';
import * as WebSocket from 'ws';
import {join} from 'path';
import { disconnect } from 'cluster';

// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Express server
const app = express();

const PORT: string | number = process.env.PORT || 4000;
const DIST_FOLDER: string = join(process.cwd(), 'dist/browser');

// Import the SSR functions from @angular/platform-server
import { renderModule } from '@angular/platform-server';

// Serve static files from /browser
app.get('*.*', express.static(DIST_FOLDER, {
  maxAge: '1y'
}));

// All regular routes use the Universal engine
app.get('*', (req: any, res: any) => {
  const indexHtml = readFileSync(join(DIST_FOLDER, 'index.html')).toString();

  renderModule(AppServerModule, {
    document: indexHtml,
    url: req.url
  }).then(html => {
    res.send(html);
  }).catch(err => {
    console.error('Error rendering app:', err);
    res.status(500).send('Server error');
  });
});

// initialize the WebSocket server instance
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  session?: string;
  name?: string;
  content?: string;
}

export class Message {
  constructor(
      public content: string,
      public sender: string,
      public type: 'chat' | 'points' | 'action' |'disconnect' | 'description',
  ) { }
}

function createMessage(content: string, sender = 'NS', type: 'chat' | 'points' | 'action' |'disconnect' | 'description'): string {
  return JSON.stringify(new Message(content, sender, type));
}

const connections: any = {};

wss.on('connection', (ws: WebSocket, req: any) => {
  // TypeScript fix for req.url
  if (!req.url) {
    req.url = '/';
  }

  const extWs = ws as ExtWebSocket;
  extWs.session = req.url.replace('/?session=', '');


  extWs.isAlive = true;

  wss.clients
    .forEach((client: any) => {
      if (client.session === extWs.session) {
        ws.send(createMessage(client.content, client.name, 'points'));
      }
    });
  ws.on('pong', () => {
      extWs.isAlive = true;
  });

  // connection is up, let's add a simple simple event
  ws.on('message', (msg: string) => {

      const message = JSON.parse(msg) as Message;

      extWs.name = message.sender;

      switch (message.type) {
        case 'chat':
          setTimeout(() => {
            wss.clients
              .forEach((client: any) => {
                if (client.session === extWs.session) {
                  client.send(createMessage(message.content, message.sender, 'chat'));
                }
              });

          }, 100);
          break;
        case 'description':
          setTimeout(() => {
            wss.clients
              .forEach((client: any) => {
                if (client.session === extWs.session) {
                  client.send(createMessage(message.content, message.sender, 'description'));
                }
              });

          }, 100);
          break;
        case 'points':
          if (message.content === 'ClearVotes') {
            wss.clients
              .forEach((client: any) => {
                if (client.session === extWs.session) {
                  wss.clients
                    .forEach((connectedClient: any) => {
                      if (client.session === connectedClient.session && connectedClient.content !== 'disconnect') {
                        connectedClient.content = undefined;
                        client.send(createMessage(undefined, connectedClient.name, 'points'));
                      }
                    });
                }
              });
          } else if (message.content === 'spectate') {
            wss.clients
              .forEach((client: any) => {
                if (client.session === extWs.session) {
                  client.send(createMessage('disconnect', extWs.name, 'disconnect'));
                  extWs.content = 'disconnect';
                }
              });
          } else {
            extWs.content = message.content;
            setTimeout(() => {
              wss.clients
                .forEach((client: any) => {
                  if (client.session === extWs.session) {
                    client.send(createMessage(message.content, message.sender, 'points'));
                  }
                });

            }, 100);
          }
          break;
        default:
          break;
      }



  });

  ws.on('error', (err) => {
    wss.clients
      .forEach((client: any) => {
        if (client.session === extWs.session && ws !== client) {
          client.send(createMessage('disconnect', extWs.name, 'disconnect'));
        }
      });
  });
});

setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {
      const extWs = ws as ExtWebSocket;
      if (!extWs.isAlive) {
        wss.clients
          .forEach((client: any) => {
            if (client.session === extWs.session && ws !== client) {
              client.send(createMessage('disconnect', extWs.name, 'disconnect'));
            }
          });
        console.log('client Disconnected');
        return ws.terminate();
      }

      extWs.isAlive = false;
      ws.ping(null, undefined);
  });
}, 10000);

server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
