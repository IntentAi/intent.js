import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimitBucket } from './RateLimitBucket';

// Fake Headers that satisfy the .get() interface
function fakeHeaders(map: Record<string, string>): Headers {
  return { get: (k: string) => map[k] ?? null } as unknown as Headers;
}

describe('RateLimitBucket', () => {
  let bucket: RateLimitBucket;

  beforeEach(() => {
    bucket = new RateLimitBucket();
  });

  describe('acquire()', () => {
    it('resolves immediately when remaining is Infinity (fresh bucket)', async () => {
      await expect(bucket.acquire()).resolves.toBeUndefined();
    });

    it('decrements remaining on each acquire', async () => {
      bucket.limit = 5;
      bucket.remaining = 5;

      await bucket.acquire();
      expect(bucket.remaining).toBe(4);

      await bucket.acquire();
      expect(bucket.remaining).toBe(3);
    });

    it('serializes concurrent acquires so remaining never goes negative', async () => {
      bucket.limit = 2;
      bucket.remaining = 2;
      // future reset so the bucket doesn't auto-refill
      bucket.reset = Math.floor(Date.now() / 1000) + 60;

      // fire 2 concurrent acquires — both should resolve, remaining should hit 0
      await Promise.all([bucket.acquire(), bucket.acquire()]);
      expect(bucket.remaining).toBe(0);
    });

    it('resets remaining when reset time has passed', async () => {
      bucket.limit = 5;
      bucket.remaining = 0;
      // set reset to the past so the bucket refills on acquire
      bucket.reset = Math.floor(Date.now() / 1000) - 1;

      await bucket.acquire();
      // remaining was refilled to limit (5), then decremented by this acquire
      expect(bucket.remaining).toBe(4);
    });
  });

  describe('update()', () => {
    it('updates bucket state from response headers', () => {
      bucket.update(fakeHeaders({
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '7',
        'x-ratelimit-reset': '1700000000',
        'x-ratelimit-bucket': 'abc123',
      }));

      expect(bucket.limit).toBe(10);
      expect(bucket.remaining).toBe(7);
      expect(bucket.reset).toBe(1700000000);
      expect(bucket.bucket).toBe('abc123');
    });

    it('ignores missing headers', () => {
      bucket.limit = 5;
      bucket.remaining = 3;
      bucket.update(fakeHeaders({}));

      expect(bucket.limit).toBe(5);
      expect(bucket.remaining).toBe(3);
    });
  });

  describe('processQueue', () => {
    it('queues requests when remaining is 0 and releases after reset', async () => {
      vi.useFakeTimers();

      bucket.limit = 2;
      bucket.remaining = 0;
      // resets 500ms from now
      bucket.reset = Math.floor(Date.now() / 1000) + 1;

      const acquired = bucket.acquire();
      // advance past the reset time
      await vi.advanceTimersByTimeAsync(1100);

      await expect(acquired).resolves.toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('clear()', () => {
    it('rejects all queued requests', async () => {
      vi.useFakeTimers();

      bucket.limit = 1;
      bucket.remaining = 0;
      bucket.reset = Math.floor(Date.now() / 1000) + 60;

      const p = bucket.acquire();
      // flush microtasks so _acquireSlot runs and populates the queue
      await vi.advanceTimersByTimeAsync(0);
      bucket.clear(new Error('shutdown'));

      await expect(p).rejects.toThrow('shutdown');

      vi.useRealTimers();
    });
  });
});
