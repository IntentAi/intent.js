/** Connection state machine values */
export enum GatewayState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING   = 'CONNECTING',
  CONNECTED    = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
}

/** Phase 1 implemented opcodes */
export const Opcodes = {
  DISPATCH:      0,
  HEARTBEAT:     1,
  IDENTIFY:      2,
  READY:         3,
  HEARTBEAT_ACK: 11,
} as const;

export type Opcode = (typeof Opcodes)[keyof typeof Opcodes];

import type { RawUser, RawServer } from '../types';

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
