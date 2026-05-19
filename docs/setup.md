# Setup

## Prerequisites

- Node.js **>= 20**
- [pnpm](https://pnpm.io/) **9**
- Cursor or VS Code
- Telegram bot token from [@BotFather](https://t.me/BotFather)

## Build

```bash
pnpm install
pnpm build
pnpm test
```

## Extension setup

1. Install the **Agent Remote** extension (from `packages/vscode-extension` when packaged).
2. Run **Agent Remote: Configure Telegram Token** — token is stored in **SecretStorage** only.
3. Run **Agent Remote: Start Bridge** — local service on `127.0.0.1` with ephemeral auth token.
4. Run **Agent Remote: Generate Pairing Code**.
5. In Telegram (private chat with your bot), send `/pair <code>` within the TTL window.
6. Send `/status` to verify bridge, MCP, and hooks state.

## MCP (optional)

See [ai-workflow/mcp-config-guide.md](ai-workflow/mcp-config-guide.md).

1. `pnpm build`
2. Copy `.cursor/mcp.example.json` to `.cursor/mcp.json`
3. Set `AGENT_REMOTE_BRIDGE_URL` and `AGENT_REMOTE_BRIDGE_TOKEN` from running bridge
4. Enable the server in Cursor MCP settings

## Hooks (optional)

1. Run **Agent Remote: Install Cursor Hooks** from the extension (confirms before writing config).
2. Runtime scripts live in `packages/hooks/` when implemented.

## First session

Send to the bot:

```text
/new Fix the failing tests and summarize changes
```

## Troubleshooting

- **409 conflict:** webhook active while using polling — bot should call `deleteWebhook` or switch modes explicitly.
- **Bridge unreachable:** ensure extension started bridge; check localhost port and auth token.
- **Unauthorized chat:** complete pairing; only allowlisted private chat is accepted by default.

More: [architecture.md](architecture.md), [security.md](security.md).
