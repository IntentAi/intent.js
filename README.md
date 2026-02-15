# intent.js

TypeScript bot SDK for Intent. Familiar patterns if you know discord.js.

## Status

Early development. Scaffolding complete, SDK implementation in progress.

## Quick Example

```typescript
import { Client } from 'intent.js';

const client = new Client();

client.on('ready', () => {
  console.log(`Connected as ${client.user.username}`);
});

client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.channel.send('pong');
  }
});

client.login('bot_xxxxxxxxxxxxx');
```

## Key Differences from discord.js

- Servers not guilds
- No intents in Phase 1 (you get all events)
- MessagePack encoding instead of JSON
- Some snake_case fields (`display_name` vs `displayName`)

## Phase 1 Implementation

Events: `ready`, `messageCreate`, `messageUpdate`, `messageDelete`, `serverCreate`, `channelCreate`

REST: Full CRUD for servers, channels, messages

## Development

```bash
npm run build && npm run typecheck && npm run lint
```

## License

MIT
