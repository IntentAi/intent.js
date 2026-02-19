import { encode as pack, decode as unpack } from '@msgpack/msgpack';
import type { GatewayPayload } from './types';

/**
 * Encode a gateway payload to MessagePack binary.
 * All frames sent to the server use this format.
 */
export function encode(payload: GatewayPayload): Uint8Array {
  return pack(payload);
}

/**
 * Decode a MessagePack binary frame from the server.
 * ws delivers messages as Buffer, which @msgpack/msgpack accepts directly.
 */
export function decode(data: Buffer | Uint8Array): GatewayPayload {
  return unpack(data) as GatewayPayload;
}
