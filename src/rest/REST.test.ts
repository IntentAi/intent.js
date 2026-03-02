import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { REST } from './REST';
import { IntentError } from './errors';
import type { RawServer, RawMessage } from '../types';

// ---- fetch mock helpers ----

// Builds a minimal Response-like object for successful JSON responses
function mockOk<T>(data: T, extraHeaders: Record<string, string> = {}): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...extraHeaders };
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

// Builds a mock error response — status < 200 or >= 300
function mockErr(status: number, body: Record<string, unknown> = {}): Response {
  return {
    ok: false,
    status,
    headers: { get: (k: string) => ({ 'content-type': 'application/json' })[k.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// 204 No Content
function mock204(): Response {
  return {
    ok: true,
    status: 204,
    headers: { get: () => null },
    json: async () => undefined,
    text: async () => '',
  } as unknown as Response;
}

// Shared raw fixtures
const rawServer: RawServer = {
  id: '100',
  name: 'Test Server',
  owner_id: '1',
  icon_url: null,
  description: null,
  member_count: 0,
  created_at: '2025-01-01T00:00:00Z',
};

const rawMessage: RawMessage = {
  id: '300',
  channel_id: '200',
  author: { id: '1', username: 'bot', display_name: 'Bot', avatar_url: null, created_at: '2025-01-01T00:00:00Z' },
  content: 'hello',
  created_at: '2025-01-01T00:00:00Z',
  edited_at: null,
};

describe('REST', () => {
  describe('token guard', () => {
    it('throws IntentError when no token is set', async () => {
      const rest = new REST();
      await expect(rest.request('GET', '/test')).rejects.toThrow(IntentError);
      await expect(rest.request('GET', '/test')).rejects.toThrow('No auth token set');
    });

    it('does not throw when token is provided in constructor', async () => {
      const rest = new REST({ token: 'test_token' });
      // will fail with a network error, but shouldn't throw IntentError
      const result = rest.request('GET', '/test').catch((e) => e);
      const err = await result;
      expect(err).not.toBeInstanceOf(IntentError);
    });

    it('does not throw after setToken()', async () => {
      const rest = new REST();
      rest.setToken('test_token');
      const result = rest.request('GET', '/test').catch((e) => e);
      const err = await result;
      expect(err).not.toBeInstanceOf(IntentError);
    });
  });

  describe('validateSnowflake', () => {
    it('rejects non-numeric server IDs', async () => {
      const rest = new REST({ token: 'test' });
      await expect(rest.getServer('abc')).rejects.toThrow('Invalid serverId');
    });

    it('rejects empty IDs', async () => {
      const rest = new REST({ token: 'test' });
      await expect(rest.getServer('')).rejects.toThrow('Invalid serverId');
    });
  });

  // ---- request basics ----
  // Each test stubs global fetch, makes one REST call, and inspects what
  // fetch was actually called with.

  describe('request basics', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockReset();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('createServer sends POST to /servers with JSON body', async () => {
      fetchMock.mockResolvedValueOnce(mockOk(rawServer));

      const rest = new REST({ token: 'bot_token' });
      await rest.createServer({ name: 'My Server' });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(init.method).toBe('POST');
      expect(url).toBe('https://api.intent.chat/v1/servers');
      expect(JSON.parse(init.body as string)).toEqual({ name: 'My Server' });
    });

    it('sets Authorization: Bearer <token> on every request', async () => {
      fetchMock.mockResolvedValueOnce(mockOk(rawServer));

      const rest = new REST({ token: 'my_secret_token' });
      await rest.listServers();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(init.headers['Authorization']).toBe('Bearer my_secret_token');
    });

    it('sets Content-Type: application/json on every request', async () => {
      fetchMock.mockResolvedValueOnce(mockOk(rawServer));

      const rest = new REST({ token: 'tok' });
      await rest.listServers();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('listMessages sends GET with query params', async () => {
      fetchMock.mockResolvedValueOnce(mockOk([rawMessage]));

      const rest = new REST({ token: 'tok' });
      await rest.listMessages('200', { limit: 50, before: '111111111' });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe('/v1/channels/200/messages');
      expect(parsed.searchParams.get('limit')).toBe('50');
      expect(parsed.searchParams.get('before')).toBe('111111111');
    });

    it('deleteChannel sends DELETE with no body', async () => {
      fetchMock.mockResolvedValueOnce(mock204());

      const rest = new REST({ token: 'tok' });
      await rest.deleteChannel('200');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('DELETE');
      expect(url).toContain('/channels/200');
      expect(init.body).toBeUndefined();
    });

    it('204 responses resolve to undefined without throwing', async () => {
      fetchMock.mockResolvedValueOnce(mock204());

      const rest = new REST({ token: 'tok' });
      const result = await rest.deleteServer('100');
      expect(result).toBeUndefined();
    });
  });
});
