# Development

```bash
pnpm install
pnpm build
pnpm test
```

## Run bridge standalone

Create a gitignored `.env` at the repo root (see `.env.example`) with `AGENT_REMOTE_TELEGRAM_TOKEN`, or export it in the shell. The bridge CLI loads the nearest `.env` automatically.

```bash
pnpm --filter @agent-remote/bridge run build
node packages/bridge/dist/cli.js
```

Copy the `url` and `authToken` from the `bridge-ready` JSON line for MCP (`AGENT_REMOTE_BRIDGE_URL`, `AGENT_REMOTE_BRIDGE_TOKEN`).

## Extension dev

Open `packages/vscode-extension` in Extension Development Host (F5).

## Tests

Vitest runs `packages/**/*.test.ts` from the repo root.
