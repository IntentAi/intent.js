# intent.js

TypeScript bot SDK for [Intent](https://github.com/IntentAi/intent). Familiar API if you know discord.js.

> Phase 1 development — gateway, REST client, structures, and rate limiting implemented. Event system wired up and tested.

## Example

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

## Differences from discord.js

- Servers, not guilds
- MessagePack encoding, not JSON
- No intents filtering yet (you get all events)

## Development

```bash
npm install
npm run build && npm run typecheck && npm run lint
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT
