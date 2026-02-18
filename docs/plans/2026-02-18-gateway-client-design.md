# Gateway Client Architecture — intent.js

## Decision summary

discord.js-style public API. `Client` is the only class bot devs touch. `Gateway` is a private implementation detail. Structures wrap raw data and expose methods.

## Folder structure

```
src/
├── client/
│   └── Client.ts          — public class, coordinates REST + Gateway
├── gateway/
│   ├── Gateway.ts         — internal ws manager, not exported
│   ├── encoding.ts        — done
│   ├── types.ts           — done
│   └── index.ts           — done
├── structures/
│   ├── Message.ts         — wraps message data, reply/edit/delete
│   ├── Server.ts          — wraps server data
│   ├── Channel.ts         — wraps channel data
│   └── User.ts            — wraps user data
├── rest/                  — done
└── index.ts               — exports Client, structures, REST, types
```

## Client

```ts
export class Client extends EventEmitter {
  readonly #rest: REST
  readonly #gateway: Gateway

  constructor(options: { token: string; url?: string })

  login(): void     // connect gateway
  destroy(): void   // disconnect cleanly

  get rest(): REST  // accessor for structures

  on(event: 'ready',         listener: (data: ReadyData) => void): this
  on(event: 'messageCreate', listener: (msg: Message) => void): this
  on(event: 'messageUpdate', listener: (msg: Message) => void): this
  on(event: 'messageDelete', listener: (payload: { id: string; channelId: string }) => void): this
  on(event: 'serverCreate',  listener: (server: Server) => void): this
  on(event: 'channelCreate', listener: (channel: Channel) => void): this
}
```

Client wires gateway SCREAMING_SNAKE events to camelCase, constructing structures before emitting.

## Gateway (internal, not exported)

- Connect → send Identify (op 2) immediately on open
- Ready (op 3) → parse `heartbeat_interval`, start heartbeat loop
- Heartbeat with `awaitingAck` flag — 3 missed ACKs closes connection
- Reconnect: exponential backoff 1s–30s with ±25% jitter
- Sequence number tracked on every Dispatch (Resume prep)
- Emits raw SCREAMING_SNAKE events for Client to map

## Structures

Shared `ClientRef` interface avoids circular imports:

```ts
interface ClientRef {
  rest: REST
}
```

**Message:**
```ts
class Message {
  id: string
  channelId: string
  content: string
  author: User
  createdAt: Date

  reply(content: string): Promise<Message>
  edit(content: string): Promise<Message>
  delete(): Promise<void>
}
```

**Server**, **Channel**, **User** — data holders in Phase 1:
```ts
class Server  { id, name, ownerId, memberCount, iconUrl }
class Channel { id, serverId, name, type, topic, position }
class User    { id, username, displayName, avatarUrl }
```

## Phase 1 events

| Wire event     | Client event    | Payload              |
|----------------|-----------------|----------------------|
| Ready (op 3)   | `ready`         | `ReadyData`          |
| MESSAGE_CREATE | `messageCreate` | `Message`            |
| MESSAGE_UPDATE | `messageUpdate` | `Message`            |
| MESSAGE_DELETE | `messageDelete` | `{ id, channelId }`  |
| SERVER_CREATE  | `serverCreate`  | `Server`             |
| CHANNEL_CREATE | `channelCreate` | `Channel`            |

## Deferred

- Caching
- Server/Channel methods
- Resume on reconnect
- Intents
- Sharding
