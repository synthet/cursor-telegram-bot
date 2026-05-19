# Agent Remote Control

Local-first remote control for Cursor/VS Code agentic coding sessions via Telegram, MCP, and Cursor hooks.

## Quick start

See [docs/setup.md](docs/setup.md) for full setup instructions.

```bash
pnpm install
pnpm build
pnpm test
```

## Packages

| Package | Description |
|---------|-------------|
| `@agent-remote/shared` | Types, Zod schemas, parsers, utilities |
| `@agent-remote/bridge` | Local orchestrator service |
| `@agent-remote/telegram-bot` | Telegram Bot API adapter |
| `@agent-remote/mcp-server` | MCP server `agent-remote-control` |
| `@agent-remote/hooks` | Cursor hook scripts |
| `@agent-remote/vscode-extension` | VS Code extension |
| `@agent-remote/cursor-extension` | Cursor-specific integration |

## Documentation

- [Setup](docs/setup.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [AI workflow (agents)](docs/ai-workflow/README.md)
- [AGENTS.md](AGENTS.md)
