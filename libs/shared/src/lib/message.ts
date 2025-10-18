// Message type constants
export const MESSAGE_TYPES: Record<string, MessageType> = {
  CHAT: 'chat',
  POINTS: 'points',
  ACTION: 'action',
  DISCONNECT: 'disconnect',
  DESCRIPTION: 'description',
  HEARTBEAT: 'heartbeat',
  JOIN: 'join',
  STATUS_AFK: 'status_afk',
  STATUS_ONLINE: 'status_online',
  STATUS_OFFLINE: 'status_offline',
  USER_LEFT: 'user_left',
  NAME_CHANGED: 'name_changed',
  SHOW_VOTES: 'show_votes',
  CLEAR_VOTES: 'clear_votes',
  REQUEST_STATE: 'request_state',
  STATE_SYNC: 'state_sync',
} as const;

export type MessageType =
  | 'chat'
  | 'points'
  | 'action'
  | 'disconnect'
  | 'description'
  | 'heartbeat'
  | 'join'
  | 'status_afk'
  | 'status_online'
  | 'status_offline'
  | 'user_left'
  | 'name_changed'
  | 'show_votes'
  | 'clear_votes'
  | 'request_state'
  | 'state_sync';

export class Message {
  public content: string | number | undefined;
  public sender: string;
  public type: MessageType;
  public timestamp: number;
  public session?: string;
  public fingerprint?: string;

  constructor(
    sender: string,
    content: string | number | undefined,
    type: MessageType,
    session?: string,
    timestamp?: number,
    fingerprint?: string
  ) {
    this.sender = sender;
    this.content = content;
    this.type = type;
    this.session = session;
    this.timestamp = timestamp || Date.now();
    this.fingerprint = fingerprint;
  }
}
