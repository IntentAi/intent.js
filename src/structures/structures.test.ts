import { describe, it, expect } from 'vitest';
import { Channel } from './Channel';
import { Server } from './Server';
import { User } from './User';
import { Message } from './Message';
import type { ClientRef } from '../client/ClientRef';
import type { RawChannel, RawServer, RawUser, RawMessage } from '../types';
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
});
