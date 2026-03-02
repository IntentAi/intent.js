import { describe, it, expect } from 'vitest';
import { Channel } from './Channel';
import { Server } from './Server';
import { User } from './User';
import { Message } from './Message';
import { Role } from './Role';
import { Member } from './Member';
import { Collection } from './Collection';
import type { ClientRef } from '../client/ClientRef';
import type { RawChannel, RawServer, RawUser, RawMessage, RawRole, RawMember } from '../types';
import { REST } from '../rest';

function makeClientRef(): ClientRef {
  return { rest: new REST({ token: 'test' }) };
}

const rawUser: RawUser = {
  id: '100',
  username: 'testbot',
  display_name: 'Test Bot',
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z',
};

const rawChannel: RawChannel = {
  id: '200',
  server_id: '1',
  name: 'general',
  type: 0,
  topic: 'welcome',
  position: 0,
  parent_id: null,
  created_at: '2025-01-01T00:00:00Z',
};

const rawServer: RawServer = {
  id: '1',
  name: 'Test Server',
  owner_id: '100',
  icon_url: null,
  description: 'A test server',
  member_count: 42,
  created_at: '2025-01-01T00:00:00Z',
};

const rawMessage: RawMessage = {
  id: '300',
  channel_id: '200',
  author: rawUser,
  content: 'hello world',
  created_at: '2025-01-01T00:00:00Z',
  edited_at: null,
};

const rawRole: RawRole = {
  id: '400',
  server_id: '1',
  name: 'Admin',
  permissions: 8,
  position: 1,
  color: 0xff0000,
  hoist: true,
  mentionable: false,
  created_at: '2025-01-01T00:00:00Z',
};

const rawMember: RawMember = {
  user: rawUser,
  server_id: '1',
  nickname: 'TestNick',
  roles: ['400'],
  joined_at: '2025-06-01T00:00:00Z',
};

describe('structures', () => {
  const client = makeClientRef();

  describe('User', () => {
    it('maps raw wire data to camelCase properties', () => {
      const user = new User(rawUser, client);
      expect(user.id).toBe('100');
      expect(user.username).toBe('testbot');
      expect(user.displayName).toBe('Test Bot');
      expect(user.avatarUrl).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Channel', () => {
    it('maps raw wire data to camelCase properties', () => {
      const ch = new Channel(rawChannel, client);
      expect(ch.id).toBe('200');
      expect(ch.serverId).toBe('1');
      expect(ch.name).toBe('general');
      expect(ch.topic).toBe('welcome');
      expect(ch.parentId).toBeNull();
    });
  });

  describe('Server', () => {
    it('maps raw wire data to camelCase properties', () => {
      const srv = new Server(rawServer, client);
      expect(srv.id).toBe('1');
      expect(srv.name).toBe('Test Server');
      expect(srv.ownerId).toBe('100');
      expect(srv.memberCount).toBe(42);
    });
  });

  describe('Message', () => {
    it('maps raw wire data and wraps author as User', () => {
      const msg = new Message(rawMessage, client);
      expect(msg.id).toBe('300');
      expect(msg.channelId).toBe('200');
      expect(msg.content).toBe('hello world');
      expect(msg.author).toBeInstanceOf(User);
      expect(msg.author.username).toBe('testbot');
      expect(msg.editedAt).toBeNull();
    });
  });

  describe('Role', () => {
    it('maps raw wire data to camelCase properties', () => {
      const role = new Role(rawRole, client);
      expect(role.id).toBe('400');
      expect(role.serverId).toBe('1');
      expect(role.name).toBe('Admin');
      expect(role.permissions).toBe(8);
      expect(role.position).toBe(1);
      expect(role.color).toBe(0xff0000);
      expect(role.hoist).toBe(true);
      expect(role.mentionable).toBe(false);
      expect(role.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Member', () => {
    it('wraps user as User and exposes member fields', () => {
      const member = new Member(rawMember, client);
      expect(member.user).toBeInstanceOf(User);
      expect(member.user.username).toBe('testbot');
      expect(member.serverId).toBe('1');
      expect(member.nickname).toBe('TestNick');
      expect(member.roles).toEqual(['400']);
      expect(member.joinedAt).toBeInstanceOf(Date);
    });

    it('displayName returns nickname when set', () => {
      const member = new Member(rawMember, client);
      expect(member.displayName).toBe('TestNick');
    });

    it('displayName falls back to username when no nickname', () => {
      const member = new Member({ ...rawMember, nickname: null }, client);
      expect(member.displayName).toBe('testbot');
    });
  });

  describe('Collection', () => {
    function makeCollection(): Collection<string, number> {
      const c = new Collection<string, number>();
      c.set('a', 1);
      c.set('b', 2);
      c.set('c', 3);
      return c;
    }

    it('extends Map', () => {
      expect(makeCollection()).toBeInstanceOf(Map);
    });

    it('filter returns matching entries', () => {
      const result = makeCollection().filter((v) => v > 1);
      expect(result.size).toBe(2);
      expect(result.get('b')).toBe(2);
    });

    it('find returns first matching value', () => {
      expect(makeCollection().find((v) => v === 2)).toBe(2);
      expect(makeCollection().find((v) => v === 99)).toBeUndefined();
    });

    it('map transforms values', () => {
      expect(makeCollection().map((v) => v * 2)).toEqual([2, 4, 6]);
    });

    it('first and last work correctly', () => {
      const c = makeCollection();
      expect(c.first()).toBe(1);
      expect(c.last()).toBe(3);
    });

    it('first/last return undefined on empty collection', () => {
      const empty = new Collection<string, number>();
      expect(empty.first()).toBeUndefined();
      expect(empty.last()).toBeUndefined();
    });

    it('random returns undefined for empty collection', () => {
      expect(new Collection<string, number>().random()).toBeUndefined();
    });

    it('toJSON returns all values as array', () => {
      expect(makeCollection().toJSON()).toEqual([1, 2, 3]);
    });
  });
});
