interface QueuedRequest {
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Rate limit bucket for tracking requests to a specific route.
 *
 * Uses a promise-chain mutex to serialize acquire() calls without
 * busy-polling, and re-checks server state after sleeping so
 * update() headers from in-flight responses aren't ignored.
 */
export class RateLimitBucket {
  public limit: number = Infinity;
  public remaining: number = Infinity;
  public reset: number = 0;
  public bucket?: string;

  private queue: QueuedRequest[] = [];
  private processing = false;

  // Promise-chain mutex — each acquire() chains on the previous so only
  // one caller reads/writes remaining at a time. No spin loops needed.
  private _mutex: Promise<void> = Promise.resolve();

  /**
   * Wait for rate limit availability before proceeding.
   * Serialized via promise chain so concurrent callers never race on remaining.
   */
  public acquire(): Promise<void> {
    const ticket = this._mutex.then(() => this._acquireSlot());
    // Swallow rejections on the chain so a failed acquire doesn't block future ones
    this._mutex = ticket.catch(() => {});
    return ticket;
  }

  private async _acquireSlot(): Promise<void> {
    const now = Date.now();
    const resetMs = this.reset * 1000;

    if (now >= resetMs && this.reset > 0) {
      this.remaining = this.limit;
    }

    if (this.remaining > 0) {
      this.remaining--;
      return;
    }

    // Out of capacity — hand off to the queue processor
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Update rate limit info from response headers
   */
  public update(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const bucket = headers.get('x-ratelimit-bucket');

    if (limit) this.limit = parseInt(limit, 10);
    if (remaining) this.remaining = parseInt(remaining, 10);
    if (reset) this.reset = parseInt(reset, 10);
    if (bucket) this.bucket = bucket;
  }

  /**
   * Process queued requests when rate limit resets.
   * Re-reads this.reset after each sleep so update() changes during
   * the wait aren't lost — prevents over-releasing on stale state.
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const resetMs = this.reset * 1000;

      if (now < resetMs) {
        await new Promise((r) => setTimeout(r, resetMs - now));
      }

      // Re-check after waking — update() may have shifted the window
      const currentResetMs = this.reset * 1000;
      if (Date.now() >= currentResetMs) {
        this.remaining = this.limit;
      } else {
        // Window moved forward while we slept, loop to wait again
        continue;
      }

      while (this.queue.length > 0 && this.remaining > 0) {
        const request = this.queue.shift();
        if (request) {
          this.remaining--;
          request.resolve();
        }
      }
    }

    this.processing = false;
  }

  /**
   * Clear the queue and reject all pending requests
   */
  public clear(error: Error): void {
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) request.reject(error);
    }
  }
}
