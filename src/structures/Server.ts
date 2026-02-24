import type { ClientRef } from '../client/ClientRef';
import type { RawServer } from '../types';
import { Channel } from './Channel';

export class Server {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly iconUrl: string | null;
  readonly description: string | null;
  readonly memberCount: number;
  readonly createdAt: Date;

  readonly #client: ClientRef;

  constructor(data: RawServer, client: ClientRef) {
    this.#client     = client;
    this.id          = data.id;
    this.name        = data.name;
    this.ownerId     = data.owner_id;
    this.iconUrl     = data.icon_url ?? null;
    this.description = data.description ?? null;
    this.memberCount = data.member_count;
    this.createdAt   = new Date(data.created_at);
  }

  edit(data: { name?: string; description?: string }): Promise<Server> {
    return this.#client.rest
      .updateServer(this.id, data)
      .then((raw) => new Server(raw, this.#client));
  }

  delete(): Promise<void> {
    return this.#client.rest.deleteServer(this.id);
  }

  leave(): Promise<void> {
    return this.#client.rest.leaveServer(this.id);
  }

  createChannel(data: { name: string; type?: number; topic?: string; position?: number }): Promise<Channel> {
    return this.#client.rest
      .createChannel(this.id, { type: 0, ...data })
      .then((raw) => new Channel(raw, this.#client));
  }
}
