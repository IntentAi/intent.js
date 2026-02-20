import type { ClientRef } from '../client/ClientRef';
import type { RawMessage } from '../types';
import { User } from './User';

export class Message {
  readonly id: string;
  readonly channelId: string;
  readonly content: string;
  readonly author: User;
  readonly createdAt: Date;
  readonly editedAt: Date | null;

  readonly #client: ClientRef;

  constructor(data: RawMessage, client: ClientRef) {
    this.#client   = client;
    this.id        = data.id;
    this.channelId = data.channel_id;
    this.content   = data.content;
    this.author    = new User(data.author, client);
    this.createdAt = new Date(data.created_at);
    this.editedAt  = data.edited_at ? new Date(data.edited_at) : null;
  }

  // Phase 1 spec has no reply_to_id — posts to the same channel without threading
  reply(content: string): Promise<Message> {
    return this.#client.rest
      .createMessage(this.channelId, { content })
      .then((raw) => new Message(raw, this.#client));
  }

  edit(content: string): Promise<Message> {
    return this.#client.rest
      .updateMessage(this.channelId, this.id, { content })
      .then((raw) => new Message(raw, this.#client));
  }

  delete(): Promise<void> {
    return this.#client.rest.deleteMessage(this.channelId, this.id);
  }
}
