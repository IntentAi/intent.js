import { describe, it, expect } from 'vitest';
import { Route } from './Route';

describe('Route', () => {
  describe('bucketKey', () => {
    it('different server IDs produce different bucket keys', () => {
      const a = new Route('GET', '/servers/111/channels');
      const b = new Route('GET', '/servers/222/channels');
      expect(a.bucketKey).not.toBe(b.bucketKey);
    });

    it('different channel IDs produce different bucket keys', () => {
      const a = new Route('GET', '/channels/111/messages');
      const b = new Route('GET', '/channels/222/messages');
      expect(a.bucketKey).not.toBe(b.bucketKey);
    });

    it('same channel with different message IDs share a bucket key', () => {
      // message_id is a minor param and gets normalized — both requests
      // share the same rate limit bucket regardless of which message they target
      const a = new Route('GET', '/channels/123/messages/111111111');
      const b = new Route('GET', '/channels/123/messages/999999999');
      expect(a.bucketKey).toBe(b.bucketKey);
    });

    it('different methods on the same path produce different bucket keys', () => {
      const get  = new Route('GET',  '/channels/123/messages');
      const post = new Route('POST', '/channels/123/messages');
      expect(get.bucketKey).not.toBe(post.bucketKey);
    });

    it('PATCH on different messages in the same channel shares a key', () => {
      const a = new Route('PATCH', '/channels/123/messages/111111111');
      const b = new Route('PATCH', '/channels/123/messages/222222222');
      expect(a.bucketKey).toBe(b.bucketKey);
    });

    it('PATCH and DELETE on the same message path differ only by method', () => {
      const patch = new Route('PATCH',  '/channels/123/messages/111111111');
      const del   = new Route('DELETE', '/channels/123/messages/111111111');
      // same channel and normalized message ID, but different method → different key
      expect(patch.bucketKey).not.toBe(del.bucketKey);
    });

    it('server-scoped and channel-scoped paths are always distinct keys', () => {
      const server  = new Route('GET', '/servers/1/channels');
      const channel = new Route('GET', '/channels/1/messages');
      expect(server.bucketKey).not.toBe(channel.bucketKey);
    });
  });

  describe('url()', () => {
    it('appends path to the base URL', () => {
      const r = new Route('GET', '/servers/123');
      expect(r.url('https://api.intent.chat/v1')).toBe('https://api.intent.chat/v1/servers/123');
    });

    it('works with trailing-slash-free bases', () => {
      const r = new Route('POST', '/channels/1/messages');
      expect(r.url('https://api.intent.chat/v1')).toBe('https://api.intent.chat/v1/channels/1/messages');
    });
  });
});
