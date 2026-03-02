import { describe, it, expect } from 'vitest';
import {
  IntentError,
  HTTPError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
} from './errors';

describe('error classes', () => {
  describe('IntentError', () => {
    it('is an instance of Error', () => {
      expect(new IntentError('oops')).toBeInstanceOf(Error);
    });

    it('sets name to IntentError', () => {
      expect(new IntentError('oops').name).toBe('IntentError');
    });

    it('preserves the message', () => {
      expect(new IntentError('something went wrong').message).toBe('something went wrong');
    });
  });

  describe('HTTPError', () => {
    const err = new HTTPError(422, 'POST', '/servers', 'Unprocessable', 'INVALID_BODY');

    it('extends IntentError', () => {
      expect(err).toBeInstanceOf(IntentError);
    });

    it('exposes status, method, url, and code', () => {
      expect(err.status).toBe(422);
      expect(err.method).toBe('POST');
      expect(err.url).toBe('/servers');
      expect(err.code).toBe('INVALID_BODY');
    });

    it('code is optional', () => {
      const noCode = new HTTPError(400, 'GET', '/x', 'Bad request');
      expect(noCode.code).toBeUndefined();
    });
  });

  describe('RateLimitError', () => {
    const err = new RateLimitError('GET', '/channels/1/messages', 5, true, 'bucket-abc');

    it('extends HTTPError and IntentError', () => {
      expect(err).toBeInstanceOf(HTTPError);
      expect(err).toBeInstanceOf(IntentError);
    });

    it('always has status 429', () => {
      expect(err.status).toBe(429);
    });

    it('exposes retryAfter, global flag, and bucket', () => {
      expect(err.retryAfter).toBe(5);
      expect(err.global).toBe(true);
      expect(err.bucket).toBe('bucket-abc');
    });

    it('bucket is optional', () => {
      const noBucket = new RateLimitError('GET', '/x', 1, false);
      expect(noBucket.bucket).toBeUndefined();
    });

    it('global can be false for per-route limits', () => {
      const perRoute = new RateLimitError('POST', '/servers', 2, false, 'srv-bucket');
      expect(perRoute.global).toBe(false);
    });
  });

  describe('UnauthorizedError', () => {
    const err = new UnauthorizedError('GET', '/servers', 'invalid token');

    it('extends HTTPError', () => {
      expect(err).toBeInstanceOf(HTTPError);
    });

    it('status is 401', () => {
      expect(err.status).toBe(401);
    });

    it('code is UNAUTHORIZED', () => {
      expect(err.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    const err = new ForbiddenError('DELETE', '/servers/1', 'missing permissions');

    it('extends HTTPError', () => {
      expect(err).toBeInstanceOf(HTTPError);
    });

    it('status is 403', () => {
      expect(err.status).toBe(403);
    });

    it('code is FORBIDDEN', () => {
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    const err = new NotFoundError('GET', '/servers/999', 'server not found');

    it('extends HTTPError', () => {
      expect(err).toBeInstanceOf(HTTPError);
    });

    it('status is 404', () => {
      expect(err.status).toBe(404);
    });

    it('code is NOT_FOUND', () => {
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ServerError', () => {
    it('extends HTTPError', () => {
      expect(new ServerError(500, 'GET', '/x', 'internal error')).toBeInstanceOf(HTTPError);
    });

    it('accepts any 5xx status', () => {
      expect(new ServerError(502, 'GET', '/x', 'bad gateway').status).toBe(502);
      expect(new ServerError(503, 'GET', '/x', 'unavailable').status).toBe(503);
      expect(new ServerError(504, 'GET', '/x', 'timeout').status).toBe(504);
    });

    it('code is SERVER_ERROR', () => {
      expect(new ServerError(500, 'GET', '/x', 'oops').code).toBe('SERVER_ERROR');
    });
  });
});
