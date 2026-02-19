import { EventEmitter } from 'events';
import WebSocket, { type RawData } from 'ws';
import { encode, decode } from './encoding';
import { GatewayState, Opcodes } from './types';
import type { GatewayPayload, IdentifyData, ReadyData } from './types';

const MAX_MISSED_HB     = 3;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS  = 30_000;

export interface GatewayOptions {
  token: string;
  url?: string;
}

/**
 * Internal WebSocket connection manager. Not exported from the package.
 *
 * Handles the full lifecycle: connect → identify → ready → heartbeat,
 * with exponential backoff reconnection on drop. Emits raw SCREAMING_SNAKE
 * dispatch events — Client maps these to camelCase structure objects.
 */
export class Gateway extends EventEmitter {
  private readonly token: string;
  private readonly url: string;

  private ws: WebSocket | null = null;
  private _state: GatewayState = GatewayState.DISCONNECTED;

  // heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatMs: number | null = null;
  private awaitingAck = false;
  private missed = 0;

  // reconnection
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private intentionalClose = false;

  // last sequence number — carried in heartbeats, required for future Resume
  private seq: number | null = null;

  constructor(options: GatewayOptions) {
    super();
    this.token = options.token;
    this.url   = options.url ?? 'wss://gateway.intent.chat';
  }

  get state(): GatewayState { return this._state; }

  connect(): void {
    if (this._state === GatewayState.CONNECTED || this._state === GatewayState.CONNECTING) return;
    // Only clear intentionalClose on fresh connects — reconnect timer calls this from RECONNECTING
    // state and must not override a disconnect() that fired while the timer was pending.
    if (this._state === GatewayState.DISCONNECTED) this.intentionalClose = false;
    this._state = GatewayState.CONNECTING;
    this._open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._teardown();
    this._state = GatewayState.DISCONNECTED;
  }

  // ---- socket ----

  private _open(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.on('open',    ()           => this._onOpen());
    ws.on('message', (data, bin) => this._onMessage(data, bin));
    ws.on('error',   (err)       => this.emit('error', err));
    ws.on('close',   (code)      => this._onClose(code));
  }

  private _onOpen(): void {
    const identify: GatewayPayload<IdentifyData> = {
      op: Opcodes.IDENTIFY,
      d: {
        token: this.token,
        properties: { os: process.platform, browser: 'intent.js', device: 'bot' },
      },
    };
    this.ws?.send(encode(identify));
  }

  private _onMessage(data: RawData, isBinary: boolean): void {
    if (!isBinary) {
      // Intent gateway only sends binary MessagePack frames. A text frame here
      // likely means a misconfigured server or a leaked HTTP error — surface it.
      console.warn('[intent.js] Received unexpected text frame from gateway:', data.toString());
      return;
    }
    try {
      const payload = decode(this._toBuffer(data));
      if (payload.s != null) this.seq = payload.s;
      this._route(payload);
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private _onClose(code: number): void {
    this._stopHeartbeat();
    this.ws = null;

    if (this.intentionalClose) {
      this._state = GatewayState.DISCONNECTED;
      return;
    }

    this._state = GatewayState.RECONNECTING;
    this.emit('disconnect', code);
    this._scheduleReconnect();
  }

  // ---- opcode routing ----

  private _route(payload: GatewayPayload): void {
    switch (payload.op) {
      case Opcodes.READY:
        this._onReady(payload.d as ReadyData);
        break;
      case Opcodes.DISPATCH:
        if (payload.t) this.emit(payload.t, payload.d);
        break;
      case Opcodes.HEARTBEAT_ACK:
        this.awaitingAck = false;
        this.missed = 0;
        break;
    }
  }

  private _onReady(data: ReadyData): void {
    this._state   = GatewayState.CONNECTED;
    this.attempts = 0;
    this.heartbeatMs = data.heartbeat_interval;
    this._startHeartbeat();
    this.emit('READY', data);
  }

  // ---- heartbeat ----

  private _startHeartbeat(): void {
    if (!this.heartbeatMs) return;
    this._stopHeartbeat();
    // Intent protocol: client starts heartbeat immediately after Ready.
    // Each interval tick that passes with awaitingAck=true counts as a missed beat.
    // After MAX_MISSED_HB consecutive misses the connection is considered dead.
    // See intent-protocol/gateway/opcodes.md — Connection Lifecycle.
    this._beat();
    this.heartbeatTimer = setInterval(() => {
      if (this.awaitingAck && ++this.missed >= MAX_MISSED_HB) {
        this._stopHeartbeat();
        this.ws?.close(1001, 'Heartbeat timeout');
        return;
      }
      this._beat();
    }, this.heartbeatMs);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.awaitingAck    = false;
    this.missed         = 0;
  }

  private _beat(): void {
    this._send({ op: Opcodes.HEARTBEAT, d: this.seq });
    this.awaitingAck = true;
  }

  // ---- reconnection ----

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const base  = Math.min(RECONNECT_BASE_MS * 2 ** this.attempts, RECONNECT_MAX_MS);
    const delay = base * (0.75 + Math.random() * 0.5); // ±25% jitter
    this.reconnectTimer = setTimeout(() => {
      this.attempts++;
      this.connect();
    }, delay);
  }

  // ---- helpers ----

  private _send(payload: GatewayPayload): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encode(payload));
    }
  }

  private _teardown(): void {
    this._stopHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.close(1000, 'Client disconnect'); this.ws = null; }
  }

  /** Normalize ws RawData (Buffer | ArrayBuffer | Buffer[]) to a single Buffer */
  private _toBuffer(data: RawData): Buffer {
    if (Buffer.isBuffer(data)) return data;
    if (Array.isArray(data))   return Buffer.concat(data);
    return Buffer.from(data as ArrayBuffer);
  }
}
