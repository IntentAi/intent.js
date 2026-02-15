/**
 * Base error class for all Intent API errors
 */
export class IntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntentError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * HTTP error with status code and response details
 */
export class HTTPError extends IntentError {
  public readonly status: number;
  public readonly code?: string;
  public readonly method: string;
  public readonly url: string;

  constructor(
    status: number,
    method: string,
    url: string,
    message: string,
    code?: string
  ) {
    super(message);
    this.name = 'HTTPError';
    this.status = status;
    this.code = code;
    this.method = method;
    this.url = url;
  }
}

/**
 * 429 Rate limit exceeded
 */
export class RateLimitError extends HTTPError {
  public readonly retryAfter: number;
  public readonly global: boolean;
  public readonly bucket?: string;

  constructor(
    method: string,
    url: string,
    retryAfter: number,
    global: boolean,
    bucket?: string
  ) {
    super(
      429,
      method,
      url,
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      'RATE_LIMIT_EXCEEDED'
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.global = global;
    this.bucket = bucket;
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends HTTPError {
  constructor(method: string, url: string, message: string) {
    super(401, method, url, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends HTTPError {
  constructor(method: string, url: string, message: string) {
    super(403, method, url, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends HTTPError {
  constructor(method: string, url: string, message: string) {
    super(404, method, url, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 5xx Server Error
 */
export class ServerError extends HTTPError {
  constructor(status: number, method: string, url: string, message: string) {
    super(status, method, url, message, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}
