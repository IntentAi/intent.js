import type { REST } from '../rest';

/**
 * Minimal interface passed to structures so they can make REST calls
 * without importing the full Client class (avoids circular imports).
 */
export interface ClientRef {
  readonly rest: REST;
}
