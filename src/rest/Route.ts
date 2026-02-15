export type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

/**
 * Route represents an API endpoint with major parameters for rate limit bucketing
 */
export class Route {
  public readonly method: RequestMethod;
  public readonly path: string;
  public readonly bucketKey: string;

  constructor(method: RequestMethod, path: string) {
    this.method = method;
    this.path = path;
    this.bucketKey = this.generateBucketKey(method, path);
  }

  /**
   * Generate bucket key for rate limiting
   * Major parameters (server_id, channel_id, webhook_id) create separate buckets
   * Minor parameters (message_id, user_id) are normalized to placeholders
   */
  private generateBucketKey(method: string, path: string): string {
    // Keep major parameters (server_id, channel_id, webhook_id) as-is for separate buckets
    // Only normalize minor parameters (message_id) to share buckets
    const normalized = path.replace(/\/messages\/\d+/, '/messages/:id');

    return `${method}:${normalized}`;
  }

  /**
   * Compile the full URL with base
   */
  public url(base: string): string {
    return `${base}${this.path}`;
  }
}
