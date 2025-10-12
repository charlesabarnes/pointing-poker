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
  | 'user_left'
  | 'name_changed';

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
