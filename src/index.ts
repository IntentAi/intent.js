/**
 * intent.js - JavaScript/TypeScript bot SDK for Intent
 *
 * A discord.js-compatible bot framework for the Intent platform.
 */

// Core client
export { Client } from './client/Client';
export type { ClientOptions, ReadyEvent, MessageDeletePayload } from './client/Client';

// Structures
export { Message } from './structures/Message';
export { Server } from './structures/Server';
export { Channel } from './structures/Channel';
export { User } from './structures/User';
export { Role } from './structures/Role';
export { Member } from './structures/Member';
export { Collection } from './structures/Collection';

// REST
export { REST } from './rest';
export type { RequestMethod } from './rest';
export {
  IntentError,
  HTTPError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
} from './rest';

// Gateway state (useful for bots checking connection status)
export { GatewayState } from './gateway';

// Shared raw types
export type { RawUser, RawServer, RawChannel, RawMessage, RawRole, RawMember } from './types';

// Version
export const version = '0.1.0';
