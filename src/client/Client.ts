import { EventEmitter } from 'events';
import { REST } from '../rest';
import { Gateway, type GatewayOptions } from '../gateway/Gateway';
import { Message } from '../structures/Message';
import { Server } from '../structures/Server';
import { Channel } from '../structures/Channel';
import { User } from '../structures/User';
import { Collection } from '../structures/Collection';
import type { ReadyData } from '../gateway/types';
import type { RawMessage, RawServer, RawChannel } from '../types';

export interface ClientOptions {
  token: string;
  /**
   * Bitwise OR of GatewayIntentBits values.
   * Defaults to all intents — narrow this down once the server enforces per-intent filtering.
   */
  intents?: number;
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

  /** The bot's own user — null until the Ready event fires */
  user: User | null = null;

  /** All servers the bot is in, keyed by server ID */
  readonly servers: Collection<string, Server> = new Collection();

  /** All channels the bot can see, keyed by channel ID */
  readonly channels: Collection<string, Channel> = new Collection();

  /**
   * Known users the client has observed — populated from Ready and message authors.
   * Not exhaustive; only users that have appeared in events are cached.
   */
  readonly users: Collection<string, User> = new Collection();

  constructor(options: ClientOptions) {
    super();
    this.#rest = new REST({ token: options.token, baseURL: options.restUrl });

    const gwOptions: GatewayOptions = { token: options.token };
    if (options.gatewayUrl) gwOptions.url     = options.gatewayUrl;
    if (options.intents != null) gwOptions.intents = options.intents;
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
        this.user = new User(data.user, this);
        this.users.set(this.user.id, this.user);

        const servers = data.servers.map((s) => new Server(s, this));
        for (const server of servers) this.servers.set(server.id, server);

        this.emit('ready', { user: this.user, servers } satisfies ReadyEvent);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_CREATE', (raw: RawMessage) => {
      try {
        const msg = new Message(raw, this);
        // opportunistically cache the author — users collection isn't exhaustive,
        // but message events are a cheap way to keep it reasonably warm
        this.users.set(msg.author.id, msg.author);
        this.emit('messageCreate', msg);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_UPDATE', (raw: RawMessage) => {
      try {
        const msg = new Message(raw, this);
        this.users.set(msg.author.id, msg.author);
        this.emit('messageUpdate', msg);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('MESSAGE_DELETE', (raw: { id: string; channel_id: string }) => {
      this.emit('messageDelete', { id: raw.id, channelId: raw.channel_id });
    });

    this.#gateway.on('SERVER_CREATE', (raw: RawServer) => {
      try {
        const server = new Server(raw, this);
        this.servers.set(server.id, server);
        this.emit('serverCreate', server);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    this.#gateway.on('CHANNEL_CREATE', (raw: RawChannel) => {
      try {
        const channel = new Channel(raw, this);
        this.channels.set(channel.id, channel);
        this.emit('channelCreate', channel);
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
