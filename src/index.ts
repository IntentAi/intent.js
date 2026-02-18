/**
 * intent.js - JavaScript/TypeScript bot SDK for Intent
 *
 * A discord.js-compatible bot framework for the Intent platform.
 */

// Core client exports
// export { Client } from './client/Client';

// Structure exports
// export { Message } from './structures/Message';
// export { Server } from './structures/Server';
// export { Channel } from './structures/Channel';
// export { User } from './structures/User';

// REST exports
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

// Gateway exports
export { GatewayState, Opcodes, encode, decode } from './gateway';
export type { GatewayPayload, IdentifyData, ReadyData, Opcode } from './gateway';

// Builder exports
// export { EmbedBuilder } from './builders/EmbedBuilder';

// Version
export const version = '0.1.0';
