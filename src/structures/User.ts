import type { ClientRef } from '../client/ClientRef';
import type { RawUser } from '../types';

export class User {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: Date;

  constructor(data: RawUser, _client: ClientRef) {
    this.id          = data.id;
    this.username    = data.username;
    this.displayName = data.display_name;
    this.avatarUrl   = data.avatar_url ?? null;
    this.createdAt   = new Date(data.created_at);
  }
}
