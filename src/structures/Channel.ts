import type { RawChannel } from '../types';

export class Channel {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly type: number;
  readonly topic: string | null;
  readonly position: number;
  readonly parentId: string | null;
  readonly createdAt: Date;

  constructor(data: RawChannel) {
    this.id        = data.id;
    this.serverId  = data.server_id;
    this.name      = data.name;
    this.type      = data.type;
    this.topic     = data.topic ?? null;
    this.position  = data.position;
    this.parentId  = data.parent_id ?? null;
    this.createdAt = new Date(data.created_at);
  }
}
