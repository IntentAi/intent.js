import { EventEmitter } from 'events';
import { REST } from '../rest';
import { Gateway, type GatewayOptions } from '../gateway/Gateway';
import { Message } from '../structures/Message';
import { Server } from '../structures/Server';
import { Channel } from '../structures/Channel';
import { User } from '../structures/User';
import type { ReadyData } from '../gateway/types';
import type { RawMessage, RawServer, RawChannel } from '../types';

export interface ClientOptions {
  token: string;
  /** Gateway WebSocket URL — defaults to wss://gateway.intent.chat */
  gatewayUrl?: string;
  /** REST base URL — defaults to https://api.intent.chat/v1 */
  restUrl?: string;
}

export type MessageDeletePayload = { id: string; channelId: string };

/** Emitted when the gateway connection is established and the client is ready. */
export interface ReadyEvent {
  user: User;
  servers: Server[];
}

export interface ClientEvents {
  ready: [event: ReadyEvent];
  messageCreate: [msg: Message];
  messageUpdate: [msg: Message];
  messageDelete: [payload: MessageDeletePayload];
  serverCreate: [server: Server];
  channelCreate: [channel: Channel];
  disconnect: [code: number];
  error: [err: Error];
}

/**
 * The main entry point for bot code.
 *
 * Owns REST and Gateway internally — bot devs never touch either directly.
 * Dispatch events arrive from Gateway as raw wire payloads, get wrapped in
 * structure classes, then re-emitted as camelCase events with typed payloads.
 *
 * @example
 * const client = new Client({ token: 'bot_xxx' })
 * client.on('messageCreate', (msg) => msg.reply('pong'))
 * client.login()
 */
export class Client extends EventEmitter {
  readonly #rest: REST;
  readonly #gateway: Gateway;

  constructor(options: ClientOptions) {
    super();
    this.#rest = new REST({ token: options.token, baseURL: options.restUrl });

    const gwOptions: GatewayOptions = { token: options.token };
    if (options.gatewayUrl) gwOptions.url = options.gatewayUrl;
    this.#gateway = new Gateway(gwOptions);

    this.#wire();
  }

  /** Connect to the gateway and begin receiving events. */
  login(): void {
    this.#gateway.connect();
  }

  /** Disconnect from the gateway cleanly. */
  destroy(): void {
    this.#gateway.disconnect();
  }

  /**
   * REST client accessor.
   * Exposed so structure methods (msg.reply, etc.) can make API calls
   * without importing Client directly.
   */
  get rest(): REST {
    return this.#rest;
  }

  // ---- typed event overloads ----

  on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
  emit(event: string, ...args: unknown[]): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  // ---- gateway event wiring ----

  #wire(): void {
    this.#gateway.on('READY', (data: ReadyData) => {
      try {
        this.emit('ready', {
          user: new User(data.user, this),
          servers: data.servers.map((s) => new Server(s, this)),
        } satisfies ReadyEvent);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_CREATE', (raw: RawMessage) => {
      try {
        this.emit('messageCreate', new Message(raw, this));
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_UPDATE', (raw: RawMessage) => {
      try {
        this.emit('messageUpdate', new Message(raw, this));
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_DELETE', (raw: { id: string; channel_id: string }) => {
      this.emit('messageDelete', { id: raw.id, channelId: raw.channel_id });
    });

    this.#gateway.on('SERVER_CREATE', (raw: RawServer) => {
      try {
        this.emit('serverCreate', new Server(raw, this));
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('CHANNEL_CREATE', (raw: RawChannel) => {
      try {
        this.emit('channelCreate', new Channel(raw, this));
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('disconnect', (code: number) => {
      this.emit('disconnect', code);
    });

    this.#gateway.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }
}
