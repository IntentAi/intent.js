import { RateLimitBucket } from './RateLimitBucket';
import { Route, RequestMethod } from './Route';
import {
  HTTPError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
} from './errors';
import type {
  RawServer as ServerData,
  RawChannel as ChannelData,
  RawMessage as MessageData,
} from '../types';

interface RESTOptions {
  baseURL?: string;
  token?: string;
  maxRetries?: number;
  timeout?: number;
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

interface ErrorResponse {
  error: string;
  code?: string;
  retry_after?: number;
  global?: boolean;
}


/**
 * REST API client with rate limiting and auto-retry
 */
export class REST {
  private readonly baseURL: string;
  private token?: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private readonly buckets: Map<string, RateLimitBucket>;
  private globalRateLimited: boolean = false;
  private globalResetAt: number = 0;

  constructor(options: RESTOptions = {}) {
    this.baseURL = options.baseURL ?? 'https://api.intent.chat/v1';
    this.token = options.token;
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout = options.timeout ?? 15000;
    this.buckets = new Map();
  }

  /**
   * Set the authorization token
   */
  public setToken(token: string): void {
    this.token = token;
  }

  /**
   * Validate snowflake ID
   */
  private validateSnowflake(id: string, name: string): void {
    if (!id || !/^\d+$/.test(id)) {
      throw new Error(`Invalid ${name}: must be a numeric string`);
    }
  }

  /**
   * Get or create a rate limit bucket for a route
   */
  private getBucket(route: Route): RateLimitBucket {
    let bucket = this.buckets.get(route.bucketKey);
    if (!bucket) {
      bucket = new RateLimitBucket();
      this.buckets.set(route.bucketKey, bucket);
    }
    return bucket;
  }

  /**
   * Wait for global rate limit to expire
   */
  private async waitForGlobalRateLimit(): Promise<void> {
    if (!this.globalRateLimited) return;

    const now = Date.now();
    if (now >= this.globalResetAt) {
      this.globalRateLimited = false;
      return;
    }

    const delay = this.globalResetAt - now;
    await new Promise((resolve) => setTimeout(resolve, delay));
    this.globalRateLimited = false;
  }

  /**
   * Make an HTTP request with rate limiting and retries
   */
  public async request<T>(
    method: RequestMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const route = new Route(method, path);
    const bucket = this.getBucket(route);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.waitForGlobalRateLimit();

        // Only acquire bucket slot once per logical request (not per retry)
        if (attempt === 0) {
          await bucket.acquire();
        }

        const response = await this.makeRequest(route, options);
        bucket.update(response.headers);

        const global = response.headers.get('x-ratelimit-global') === 'true';
        if (global) {
          this.globalRateLimited = true;
          const reset = response.headers.get('x-ratelimit-reset');
          this.globalResetAt = reset ? parseInt(reset, 10) * 1000 : Date.now() + 1000;
        }

        return (await this.handleResponse<T>(response, route, options, attempt)) as T;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof RateLimitError) {
          if (error.global) {
            this.globalRateLimited = true;
            this.globalResetAt = Date.now() + error.retryAfter * 1000;
          }

          if (attempt === this.maxRetries) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, error.retryAfter * 1000)
          );
          continue;
        }

        if (error instanceof ServerError && attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  /**
   * Make the actual HTTP request with timeout
   */
  private async makeRequest(
    route: Route,
    options: RequestOptions
  ): Promise<Response> {
    const url = new URL(route.url(this.baseURL));

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const fetchOptions: RequestInit = {
      method: route.method,
      headers,
      signal: controller.signal,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Handle HTTP response and errors
   */
  private async handleResponse<T>(
    response: Response,
    route: Route,
    _options: RequestOptions,
    _attempt: number
  ): Promise<T | void> {
    const method = route.method;
    const url = route.url(this.baseURL);

    if (response.status === 204) {
      return;
    }

    const isJson = response.headers
      .get('content-type')
      ?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (response.ok) {
      return data as T;
    }

    const errorData = isJson ? (data as ErrorResponse) : { error: String(data) };
    const message = errorData.error || `HTTP ${response.status}`;

    switch (response.status) {
      case 429: {
        const retryAfter = errorData.retry_after ?? 5;
        const global = errorData.global ?? false;
        const bucket = response.headers.get('x-ratelimit-bucket') ?? undefined;
        throw new RateLimitError(method, url, retryAfter, global, bucket);
      }
      case 401:
        throw new UnauthorizedError(method, url, message);
      case 403:
        throw new ForbiddenError(method, url, message);
      case 404:
        throw new NotFoundError(method, url, message);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(response.status, method, url, message);
      default:
        throw new HTTPError(response.status, method, url, message, errorData.code);
    }
  }

  // Servers
  public async getServer(serverId: string): Promise<ServerData> {
    this.validateSnowflake(serverId, 'serverId');
    return this.request<ServerData>('GET', `/servers/${serverId}`);
  }

  public async listServers(): Promise<ServerData[]> {
    return this.request<ServerData[]>('GET', '/servers');
  }

  public async createServer(data: { name: string; icon?: string; description?: string }): Promise<ServerData> {
    return this.request<ServerData>('POST', '/servers', { body: data });
  }

  public async updateServer(serverId: string, data: { name?: string; description?: string }): Promise<ServerData> {
    this.validateSnowflake(serverId, 'serverId');
    return this.request<ServerData>('PATCH', `/servers/${serverId}`, { body: data });
  }

  public async deleteServer(serverId: string): Promise<void> {
    this.validateSnowflake(serverId, 'serverId');
    return this.request<void>('DELETE', `/servers/${serverId}`);
  }

  // Channels
  public async getChannel(channelId: string): Promise<ChannelData> {
    this.validateSnowflake(channelId, 'channelId');
    return this.request<ChannelData>('GET', `/channels/${channelId}`);
  }

  public async listChannels(serverId: string): Promise<ChannelData[]> {
    this.validateSnowflake(serverId, 'serverId');
    return this.request<ChannelData[]>('GET', `/servers/${serverId}/channels`);
  }

  public async createChannel(
    serverId: string,
    data: { name: string; type: number; topic?: string; position?: number }
  ): Promise<ChannelData> {
    this.validateSnowflake(serverId, 'serverId');
    return this.request<ChannelData>('POST', `/servers/${serverId}/channels`, { body: data });
  }

  public async updateChannel(
    channelId: string,
    data: { name?: string; topic?: string; position?: number }
  ): Promise<ChannelData> {
    this.validateSnowflake(channelId, 'channelId');
    return this.request<ChannelData>('PATCH', `/channels/${channelId}`, { body: data });
  }

  public async deleteChannel(channelId: string): Promise<void> {
    this.validateSnowflake(channelId, 'channelId');
    return this.request<void>('DELETE', `/channels/${channelId}`);
  }

  // Messages
  public async getMessage(channelId: string, messageId: string): Promise<MessageData> {
    this.validateSnowflake(channelId, 'channelId');
    this.validateSnowflake(messageId, 'messageId');
    return this.request<MessageData>('GET', `/channels/${channelId}/messages/${messageId}`);
  }

  public async listMessages(
    channelId: string,
    options?: { limit?: number; before?: string; after?: string }
  ): Promise<MessageData[]> {
    this.validateSnowflake(channelId, 'channelId');
    if (options?.before) this.validateSnowflake(options.before, 'before');
    if (options?.after) this.validateSnowflake(options.after, 'after');
    return this.request<MessageData[]>('GET', `/channels/${channelId}/messages`, {
      query: options,
    });
  }

  public async createMessage(channelId: string, data: { content?: string; embeds?: unknown[] }): Promise<MessageData> {
    this.validateSnowflake(channelId, 'channelId');
    return this.request<MessageData>('POST', `/channels/${channelId}/messages`, { body: data });
  }

  public async updateMessage(channelId: string, messageId: string, data: { content: string }): Promise<MessageData> {
    this.validateSnowflake(channelId, 'channelId');
    this.validateSnowflake(messageId, 'messageId');
    return this.request<MessageData>('PATCH', `/channels/${channelId}/messages/${messageId}`, {
      body: data,
    });
  }

  public async deleteMessage(channelId: string, messageId: string): Promise<void> {
    this.validateSnowflake(channelId, 'channelId');
    this.validateSnowflake(messageId, 'messageId');
    return this.request<void>('DELETE', `/channels/${channelId}/messages/${messageId}`);
  }
}
