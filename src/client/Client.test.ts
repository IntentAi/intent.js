import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventEmitter } from 'events';
import type { RawUser, RawServer, RawChannel, RawMessage } from '../types';

// Capture the gateway instance and constructor options each time a Client is created.
// vi.mock is hoisted before ESM imports, so EventEmitter must be require()'d inside the factory.
let gw: EventEmitter & { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
let lastGwOptions: Record<string, unknown>;

vi.mock('../gateway/Gateway', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('events') as typeof import('events');
  class MockGateway extends EventEmitter {
    connect    = vi.fn();
    disconnect = vi.fn();
    constructor(opts: Record<string, unknown>) {
      super();
      gw            = this as typeof gw;
      lastGwOptions = opts;
    }
  }
  return { Gateway: MockGateway };
});

import { Client } from './Client';
import { GatewayIntentBits } from '../gateway/types';
import { User } from '../structures/User';
import { Server } from '../structures/Server';
import { Channel } from '../structures/Channel';
import { Message } from '../structures/Message';

// ---- shared fixtures ----

const rawUser: RawUser = {
  id: '1',
  username: 'bot',
  display_name: 'Bot',
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z',
};

const rawServer: RawServer = {
  id: '10',
  name: 'Test Server',
  owner_id: '1',
  icon_url: null,
  description: null,
  member_count: 1,
  created_at: '2025-01-01T00:00:00Z',
};

const rawChannel: RawChannel = {
  id: '20',
  server_id: '10',
  name: 'general',
  type: 0,
  topic: null,
  position: 0,
  parent_id: null,
  created_at: '2025-01-01T00:00:00Z',
};

const rawMessage: RawMessage = {
  id: '30',
  channel_id: '20',
  author: rawUser,
  content: 'hello',
  created_at: '2025-01-01T00:00:00Z',
  edited_at: null,
};

const readyPayload = {
  user: rawUser,
  servers: [rawServer],
  heartbeat_interval: 30_000,
};

// ---- tests ----

describe('Client', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ token: 'bot_test' });
  });

  // ---- GatewayIntentBits ----

  describe('GatewayIntentBits', () => {
    it('defines seven distinct power-of-2 flags', () => {
      const bits = Object.values(GatewayIntentBits);
      expect(new Set(bits).size).toBe(bits.length);
      for (const bit of bits) expect(bit & (bit - 1)).toBe(0);
    });

    it('all flags OR together to 127', () => {
      const all = Object.values(GatewayIntentBits).reduce((a, b) => a | b, 0);
      expect(all).toBe(127);
    });
  });

  // ---- intents plumbing ----

  describe('intents option', () => {
    it('passes specified intents to Gateway', () => {
      new Client({ token: 'bot', intents: GatewayIntentBits.SERVERS });
      expect(lastGwOptions.intents).toBe(GatewayIntentBits.SERVERS);
    });

    it('intents: 0 passes through without falling back to default', () => {
      // a falsy check would silently swap 0 for ALL_INTENTS — verify that doesn't happen
      new Client({ token: 'bot', intents: 0 });
      expect(lastGwOptions.intents).toBe(0);
    });

    it('omitting intents leaves it up to Gateway to apply its own default', () => {
      new Client({ token: 'bot' });
      expect(lastGwOptions.intents).toBeUndefined();
    });
  });

  // ---- READY ----

  describe('READY event', () => {
    it('sets client.user to a User instance', () => {
      gw.emit('READY', readyPayload);
      expect(client.user).toBeInstanceOf(User);
      expect(client.user?.id).toBe('1');
    });

    it('seeds client.users with the bot user', () => {
      gw.emit('READY', readyPayload);
      expect(client.users.get('1')).toBeInstanceOf(User);
    });

    it('populates client.servers from the Ready server list', () => {
      gw.emit('READY', readyPayload);
      expect(client.servers.size).toBe(1);
      expect(client.servers.get('10')).toBeInstanceOf(Server);
    });

    it('caches are populated before the ready event fires', () => {
      let serverCount = 0;
      let userCount   = 0;
      client.on('ready', () => {
        serverCount = client.servers.size;
        userCount   = client.users.size;
      });
      gw.emit('READY', readyPayload);
      expect(serverCount).toBe(1);
      expect(userCount).toBe(1);
    });

    it('emits ready with User and Server structure instances', () => {
      const received: { user: unknown; servers: unknown[] }[] = [];
      client.on('ready', (evt) => received.push(evt));
      gw.emit('READY', readyPayload);
      expect(received).toHaveLength(1);
      expect(received[0].user).toBeInstanceOf(User);
      expect(received[0].servers[0]).toBeInstanceOf(Server);
    });

    it('client.channels is empty after Ready (protocol gap — tracked in #10)', () => {
      gw.emit('READY', readyPayload);
      expect(client.channels.size).toBe(0);
    });
  });

  // ---- MESSAGE_CREATE ----

  describe('MESSAGE_CREATE event', () => {
    it('emits messageCreate with a Message instance', () => {
      const msgs: Message[] = [];
      client.on('messageCreate', (m) => msgs.push(m));
      gw.emit('MESSAGE_CREATE', rawMessage);
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toBeInstanceOf(Message);
      expect(msgs[0].content).toBe('hello');
    });

    it('caches the message author in client.users', () => {
      gw.emit('MESSAGE_CREATE', rawMessage);
      expect(client.users.get('1')).toBeInstanceOf(User);
    });
  });

  // ---- MESSAGE_UPDATE ----

  describe('MESSAGE_UPDATE event', () => {
    it('emits messageUpdate with a Message instance', () => {
      const msgs: Message[] = [];
      client.on('messageUpdate', (m) => msgs.push(m));
      gw.emit('MESSAGE_UPDATE', { ...rawMessage, content: 'edited' });
      expect(msgs[0]).toBeInstanceOf(Message);
    });

    it('caches the author in client.users', () => {
      gw.emit('MESSAGE_UPDATE', rawMessage);
      expect(client.users.get('1')).toBeInstanceOf(User);
    });
  });

  // ---- MESSAGE_DELETE ----

  describe('MESSAGE_DELETE event', () => {
    it('emits messageDelete with id and channelId', () => {
      const payloads: unknown[] = [];
      client.on('messageDelete', (p) => payloads.push(p));
      gw.emit('MESSAGE_DELETE', { id: '30', channel_id: '20' });
      expect(payloads[0]).toEqual({ id: '30', channelId: '20' });
    });
  });

  // ---- SERVER_CREATE ----

  describe('SERVER_CREATE event', () => {
    it('adds server to cache before emitting serverCreate', () => {
      let inCacheAtEmit = false;
      client.on('serverCreate', () => { inCacheAtEmit = client.servers.has('10'); });
      gw.emit('SERVER_CREATE', rawServer);
      expect(inCacheAtEmit).toBe(true);
      expect(client.servers.get('10')).toBeInstanceOf(Server);
    });
  });

  // ---- CHANNEL_CREATE ----

  describe('CHANNEL_CREATE event', () => {
    it('adds channel to cache before emitting channelCreate', () => {
      let inCacheAtEmit = false;
      client.on('channelCreate', () => { inCacheAtEmit = client.channels.has('20'); });
      gw.emit('CHANNEL_CREATE', rawChannel);
      expect(inCacheAtEmit).toBe(true);
      expect(client.channels.get('20')).toBeInstanceOf(Channel);
    });
  });

  // ---- error routing ----

  describe('error handling', () => {
    it('routes errors from malformed payloads to the error event', () => {
      const errors: Error[] = [];
      client.on('error', (e) => errors.push(e));
      // null author will throw inside Message constructor — should be caught and routed
      gw.emit('MESSAGE_CREATE', { ...rawMessage, author: null });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(Error);
    });
  });

  // ---- login / destroy ----

  describe('login and destroy', () => {
    it('login delegates to gateway.connect()', () => {
      client.login();
      expect(gw.connect).toHaveBeenCalledOnce();
    });

    it('destroy delegates to gateway.disconnect()', () => {
      client.destroy();
      expect(gw.disconnect).toHaveBeenCalledOnce();
    });
  });
});
