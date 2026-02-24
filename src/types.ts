/** Raw API data shapes returned by the server — used by REST and structures */

export interface RawUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface RawServer {
  id: string;
  name: string;
  owner_id: string;
  icon_url?: string | null;
  description?: string | null;
  member_count: number;
  created_at: string;
}

export interface RawChannel {
  id: string;
  server_id: string;
  name: string;
  type: number;
  topic?: string | null;
  position: number;
  parent_id?: string | null;
  created_at: string;
}

export interface RawMessage {
  id: string;
  channel_id: string;
  author: RawUser;
  content: string;
  created_at: string;
  edited_at?: string | null;
  attachments?: unknown[];
  embeds?: unknown[];
}

export interface RawRole {
  id: string;
  server_id: string;
  name: string;
  permissions: number;
  position: number;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  created_at: string;
}

export interface RawMember {
  user: RawUser;
  server_id: string;
  nickname: string | null;
  roles: string[];
  joined_at: string;
}
