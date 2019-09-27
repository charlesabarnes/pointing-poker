import 'zone.js/dist/zone-node';
import {enableProdMode} from '@angular/core';
// Express Engine
import {ngExpressEngine} from '@nguniversal/express-engine';
// Import module map for lazy loading
import {provideModuleMap} from '@nguniversal/module-map-ngfactory-loader';
import { readFileSync, writeFile } from 'fs';
(global as any).XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';

import { createWindow } from 'domino';

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
const template: any = readFileSync(join(join(DIST_FOLDER, 'index.html'))).toString();
const win: Window = createWindow(template);
global['window'] = win;
global['document'] = win.document;

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', (_: any, options: any, callback: any) => {
  ngExpressEngine({
    bootstrap: AppServerModuleNgFactory,
    providers: [
      provideModuleMap(LAZY_MODULE_MAP),
      {
        provide: REQUEST,
        useValue: options.req,
      },
      {
        provide: RESPONSE,
        useValue: options.req.res,
      },
    ],
  })(_, options, callback); },
);

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

app.get('*.*', express.static(DIST_FOLDER, {
  maxAge: '1y'
}));

// All regular routes use the Universal engine
app.get('*', (req: any, res: any) => {
  res.render('index', { req });
});

// initialize the WebSocket server instance
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
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

wss.on('connection', (ws: WebSocket, req: Request) => {


  const extWs = ws as ExtWebSocket;
  ws.session = req.url.replace('/?session=', '');


  extWs.isAlive = true;

  wss.clients
    .forEach((client: any) => {
      if (client.session === ws.session) {
        ws.send(createMessage(client.content, client.name, 'points'));
      }
    });
  ws.on('pong', () => {
      extWs.isAlive = true;
  });

  // connection is up, let's add a simple simple event
  ws.on('message', (msg: string) => {

      const message = JSON.parse(msg) as Message;

      ws.name = message.sender;

      switch (message.type) {
        case 'chat':
          setTimeout(() => {
            wss.clients
              .forEach((client: any) => {
                if (client.session === ws.session) {
                  client.send(createMessage(message.content, message.sender, 'chat'));
                }
              });

          }, 100);
          break;
        case 'description':
          setTimeout(() => {
            wss.clients
              .forEach((client: any) => {
                if (client.session === ws.session) {
                  client.send(createMessage(message.content, message.sender, 'description'));
                }
              });

          }, 100);
          break;
        case 'points':
          if (message.content === 'ClearVotes') {
            wss.clients
              .forEach((client: any) => {
                if (client.session === ws.session) {
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
                if (client.session === ws.session) {
                  client.send(createMessage('disconnect', ws.name, 'disconnect'));
                  ws.content = 'disconnect';
                }
              });
          } else {
            ws.content = message.content;
            setTimeout(() => {
              wss.clients
                .forEach((client: any) => {
                  if (client.session === ws.session) {
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
        if (client.session === ws.session && ws !== client) {
          client.send(createMessage('disconnect', ws.name, 'disconnect'));
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
            if (client.session === ws.session && ws !== client) {
              client.send(createMessage('disconnect', ws.name, 'disconnect'));
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
