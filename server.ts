import 'zone.js/dist/zone-node';
import {enableProdMode} from '@angular/core';
// Express Engine
import {ngExpressEngine} from '@nguniversal/express-engine';
// Import module map for lazy loading
import {provideModuleMap} from '@nguniversal/module-map-ngfactory-loader';
import * as http from 'http';

import * as express from 'express';
import * as WebSocket from 'ws';
import {join} from 'path';

// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Express server
const app = express();

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'dist/browser');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine('html', ngExpressEngine({
  bootstrap: AppServerModuleNgFactory,
  providers: [
    provideModuleMap(LAZY_MODULE_MAP)
  ]
}));

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

app.get('*.*', express.static(DIST_FOLDER, {
  maxAge: '1y'
}));

// All regular routes use the Universal engine
app.get('*', (req, res) => {
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
      public isBroadcast = false,
      public sender: string
  ) { }
}

function createMessage(content: string, isBroadcast = false, sender = 'NS'): string {
  return JSON.stringify(new Message(content, isBroadcast, sender));
}

wss.on('connection', (ws: WebSocket) => {

  const extWs = ws as ExtWebSocket;

  extWs.isAlive = true;

  ws.on('pong', () => {
      extWs.isAlive = true;
  });

  // connection is up, let's add a simple simple event
  ws.on('message', (msg: string) => {

      const message = JSON.parse(msg) as Message;

      setTimeout(() => {
          if (message.isBroadcast) {

              // send back the message to the other clients
              wss.clients
                  .forEach(client => {
                      if (client !== ws) {
                          client.send(createMessage(message.content, true, message.sender));
                      }
                  });

          }

          ws.send(createMessage(`You sent -> ${message.content}`, message.isBroadcast));

      }, 1000);

  });

  // send immediatly a feedback to the incoming connection
  ws.send(createMessage('connected'));

  ws.on('error', (err) => {
      console.warn(`Client disconnected - reason: ${err}`);
  });
});

setInterval(() => {
  wss.clients.forEach((ws: WebSocket) => {

      const extWs = ws as ExtWebSocket;

      if (!extWs.isAlive) { return ws.terminate(); }

      extWs.isAlive = false;
      ws.ping(null, undefined);
  });
}, 10000);

server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
