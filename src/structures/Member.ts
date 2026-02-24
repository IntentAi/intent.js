import type { ClientRef } from '../client/ClientRef';
import type { RawMember } from '../types';
import { User } from './User';

export class Member {
  readonly user: User;
  readonly serverId: string;
  readonly nickname: string | null;
  readonly roles: string[];
  readonly joinedAt: Date;

  constructor(data: RawMember, client: ClientRef) {
    this.user     = new User(data.user, client);
    this.serverId = data.server_id;
    this.nickname = data.nickname;
    this.roles    = data.roles;
    this.joinedAt = new Date(data.joined_at);
  }

  /** Display name — nickname if set, otherwise the underlying username */
  get displayName(): string {
    return this.nickname ?? this.user.username;
  }
}
