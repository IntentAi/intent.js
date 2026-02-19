import type { RawServer } from '../types';

export class Server {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly iconUrl: string | null;
  readonly description: string | null;
  readonly memberCount: number;
  readonly createdAt: Date;

  constructor(data: RawServer) {
    this.id          = data.id;
    this.name        = data.name;
    this.ownerId     = data.owner_id;
    this.iconUrl     = data.icon_url ?? null;
    this.description = data.description ?? null;
    this.memberCount = data.member_count;
    this.createdAt   = new Date(data.created_at);
  }
}
