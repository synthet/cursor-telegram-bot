# Cursor Integration

## v1 supported

- VS Code-compatible extension APIs
- Bridge-spawned agent sessions (Cursor CLI or `@cursor/sdk` when available)
- MCP server `agent-remote-control` (stdio)
- Cursor hooks via hook scripts + bridge ingestion
- Telegram pairing and approvals

## Not supported

- Controlling existing GUI agent chats without a documented API
- Private / undocumented Cursor internals
- Cloud relay

## Adapters

1. **Cursor CLI** — if `cursor` or `agent` is on PATH
2. **Cursor SDK** — if `CURSOR_API_KEY` is set and `@cursor/sdk` is installed
3. **Noop** — setup guidance only
