import { MessageType } from 'shared';

export interface MessageSender {
  send(content: string | number, type?: MessageType): void;
}
