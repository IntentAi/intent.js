interface QueuedRequest {
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Rate limit bucket for tracking requests to a specific route
 */
export class RateLimitBucket {
  public limit: number = Infinity;
  public remaining: number = Infinity;
  public reset: number = 0;
  public bucket?: string;

  private queue: QueuedRequest[] = [];
  private processing: boolean = false;
  private acquiring: boolean = false;

  /**
   * Wait for rate limit availability before proceeding
   */
  public async acquire(): Promise<void> {
    // Wait if another acquire is in progress to prevent race conditions
    while (this.acquiring) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.acquiring = true;

    try {
      const now = Date.now();
      const resetTime = this.reset * 1000;

      // Reset bucket if time has passed
      if (now >= resetTime && this.reset > 0) {
        this.remaining = this.limit;
      }

      if (this.remaining > 0) {
        this.remaining--;
        return;
      }

      // Out of requests, queue it
      this.acquiring = false;
      return new Promise<void>((resolve, reject) => {
        this.queue.push({ resolve, reject });
        this.processQueue();
      });
    } finally {
      if (this.acquiring) {
        this.acquiring = false;
      }
    }
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
   * Process queued requests when rate limit resets
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const resetTime = this.reset * 1000;

      if (now < resetTime) {
        const delay = resetTime - now;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      this.remaining = this.limit;

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
