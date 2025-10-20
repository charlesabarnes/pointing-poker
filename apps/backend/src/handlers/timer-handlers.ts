import * as WebSocket from 'ws';
import { Message, ExtWebSocket } from 'shared';
import { broadcastMessage } from '../utils/broadcast';
import { SessionManager } from '../session/session-manager';

let timerServiceInstance: any;

export function setTimerService(service: any): void {
  timerServiceInstance = service;
}

export function handleStartTimer(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  const duration = typeof message.content === 'number' ? message.content : 60;
  sessionManager.startTimer(extWs.session!, duration);
  if (timerServiceInstance) {
    timerServiceInstance.registerSession(extWs.session!);
  }
  broadcastMessage(wss, extWs.session!, message);
}

export function handlePauseTimer(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  sessionManager.pauseTimer(extWs.session!);
  broadcastMessage(wss, extWs.session!, message);
}

export function handleResumeTimer(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  sessionManager.resumeTimer(extWs.session!);
  broadcastMessage(wss, extWs.session!, message);
}

export function handleStopTimer(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  sessionManager.stopTimer(extWs.session!);
  broadcastMessage(wss, extWs.session!, message);
}

export function handleExtendTimer(
  wss: WebSocket.Server,
  _ws: WebSocket,
  extWs: WebSocket & ExtWebSocket,
  message: Message,
  sessionManager: SessionManager
): void {
  const additionalSeconds = typeof message.content === 'number' ? message.content : 30;
  sessionManager.extendTimer(extWs.session!, additionalSeconds);
  broadcastMessage(wss, extWs.session!, message);
}
