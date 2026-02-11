# intent.js

JavaScript/TypeScript bot SDK for Intent.

**Designed to mirror discord.js patterns** for easy bot migration.

## Status

 **Phase 1 Development** - SDK being built.

## Why intent.js?

Communities won't migrate without their bots. intent.js makes bot porting trivial:

```javascript
// Change this:
const { Client } = require('discord.js');

// To this:
const { Client } = require('intent.js');

// Most of your code just works
```

Same class names, same method signatures, same event patterns as discord.js where possible.

## Installation

```bash
npm install intent.js
```

(Coming soon)

## Quick Start

```javascript
const { Client, GatewayIntentBits } = require('intent.js');

const client = new Client({
 intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.on('ready', () => {
 console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
 if (message.content === '!ping') {
  message.reply('Pong!');
 }
});

client.login('your-bot-token');
```

## Features

- discord.js-compatible API
- MessagePack binary protocol
- Full TypeScript support
- Promise-based
- Event-driven

## Migration from discord.js

See [examples/discord-migration](examples/discord-migration)

## Documentation

In development: Full API documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT License - See [LICENSE](LICENSE)
