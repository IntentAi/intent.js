import type { ClientRef } from '../client/ClientRef';
import type { RawChannel } from '../types';
import { Message } from './Message';

export class Channel {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly type: number;
  readonly topic: string | null;
  readonly position: number;
  readonly parentId: string | null;
  readonly createdAt: Date;

  readonly #client: ClientRef;

  constructor(data: RawChannel, client: ClientRef) {
    this.#client   = client;
    this.id        = data.id;
    this.serverId  = data.server_id;
    this.name      = data.name;
    this.type      = data.type;
    this.topic     = data.topic ?? null;
    this.position  = data.position;
    this.parentId  = data.parent_id ?? null;
    this.createdAt = new Date(data.created_at);
  }

  send(content: string): Promise<Message> {
    return this.#client.rest
      .createMessage(this.id, { content })
      .then((raw) => new Message(raw, this.#client));
  }

  edit(data: { name?: string; topic?: string; position?: number }): Promise<Channel> {
    return this.#client.rest
      .updateChannel(this.id, data)
      .then((raw) => new Channel(raw, this.#client));
  }

  delete(): Promise<void> {
    return this.#client.rest.deleteChannel(this.id);
  }

  fetchMessages(options?: { limit?: number; before?: string; after?: string }): Promise<Message[]> {
    return this.#client.rest
      .listMessages(this.id, options)
      .then((msgs) => msgs.map((raw) => new Message(raw, this.#client)));
  }
}
