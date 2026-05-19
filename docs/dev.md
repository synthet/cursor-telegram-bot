# Development

```bash
pnpm install
pnpm build
pnpm test
```

## Run bridge standalone

```bash
pnpm --filter @agent-remote/bridge run build
AGENT_REMOTE_TELEGRAM_TOKEN=... node packages/bridge/dist/cli.js
```

## Extension dev

Open `packages/vscode-extension` in Extension Development Host (F5).

## Tests

Vitest runs `packages/**/*.test.ts` from the repo root.
