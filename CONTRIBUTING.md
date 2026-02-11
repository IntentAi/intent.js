# Contributing to intent.js

Bot SDK contributions welcome!

## Design Philosophy

**Mirror discord.js patterns** where it makes sense.

Bot developers should find intent.js familiar, not foreign.

## Structure

- `src/client/` - Client class, intent bits
- `src/structures/` - Message, Server, Channel, Role, etc.
- `src/rest/` - REST API wrapper
- `src/gateway/` - WebSocket + MessagePack
- `src/builders/` - EmbedBuilder, etc.

## Requirements

- TypeScript
- Full typings
- discord.js naming compatibility
- Comprehensive tests

## License

MIT License
