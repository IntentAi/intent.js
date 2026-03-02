import type { ClientRef } from '../client/ClientRef';
import type { RawRole } from '../types';

export class Role {
  readonly id: string;
  readonly serverId: string;
  readonly name: string;
  readonly permissions: number;
  readonly position: number;
  readonly color: number;
  readonly hoist: boolean;
  readonly mentionable: boolean;
  readonly createdAt: Date;

  constructor(data: RawRole, _client: ClientRef) {
    this.id          = data.id;
    this.serverId    = data.server_id;
    this.name        = data.name;
    this.permissions = data.permissions;
    this.position    = data.position;
    this.color       = data.color;
    this.hoist       = data.hoist;
    this.mentionable = data.mentionable;
    this.createdAt   = new Date(data.created_at);
  }
}
