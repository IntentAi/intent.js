import { describe, it, expect } from 'vitest';
import { REST } from './REST';
import { IntentError } from './errors';

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
});
