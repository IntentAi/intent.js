# Contributing to intent.js

intent.js is the TypeScript bot SDK for Intent, modeled after discord.js.

## Pick an Issue

Check the [open issues](https://github.com/IntentAi/intent.js/issues). Look at the **relationships panel** on the right — some issues are blocked by others that need to land first. Comment on an issue to claim it, wait for assignment.

## Branching

Phase branches organize work. Check which one is active (look at recent branches or ask a maintainer).

```
git checkout <phase-branch> && git pull origin <phase-branch>
git checkout -b <phase-branch>/6-vitest-setup
```

No active phase branch? Use `feat/<issue>-description` off `dev`. PR against the **phase branch**, not dev or main.

## Before You Push

All must pass:

```bash
npm run build && npm run typecheck && npm run lint
```

## Commits

Conventional commits, issue references, one logical change each.

```
feat(rest): add channel message pagination [refs #6]

Implemented before/after cursor params on getMessages().
Returns up to 100 messages, matches server API spec.
```

## Code Standards

- TypeScript with full type coverage, no `any`
- Mirror discord.js naming conventions where applicable
- Async/await throughout
- Comment the reasoning, not the mechanics
- Tests for new functionality (Vitest)

## License

MIT
