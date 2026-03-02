import type { RawUser, RawServer } from '../types';

/** Connection state machine values */
export enum GatewayState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING   = 'CONNECTING',
  CONNECTED    = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

/**
 * Bitfield flags for gateway intents — OR them together in ClientOptions.intents.
 * Phase 1 always sends all intents; per-intent filtering is a future server concern.
 *
 * @example
 * import { GatewayIntentBits } from 'intent.js'
 * const client = new Client({ token, intents: GatewayIntentBits.SERVERS | GatewayIntentBits.SERVER_MESSAGES })
 */
export const GatewayIntentBits = {
  SERVERS:         1 << 0,
  CHANNELS:        1 << 1,
  SERVER_MESSAGES: 1 << 2,
  DIRECT_MESSAGES: 1 << 3,
  MEMBERS:         1 << 4,
  PRESENCE:        1 << 5,
  VOICE:           1 << 6,
} as const;

/** Phase 1 implemented opcodes */
export const Opcodes = {
  DISPATCH:      0,
  HEARTBEAT:     1,
  IDENTIFY:      2,
  READY:         3,
  HEARTBEAT_ACK: 11,
} as const;

export type Opcode = (typeof Opcodes)[keyof typeof Opcodes];

/** Base wire format shared by all gateway messages */
export interface GatewayPayload<D = unknown> {
  op: number;
  d?: D;
  t?: string;  // event name — Dispatch only
  s?: number;  // sequence number — Dispatch only
}

/** Data carried in Identify (op 2) */
export interface IdentifyData {
  token: string;
  intents: number;
  properties?: {
    os: string;
    browser: string;
    device: string;
  };
}

/** Data carried in Ready (op 3) */
export interface ReadyData {
  user: RawUser;
  servers: RawServer[];
  heartbeat_interval: number;
}
