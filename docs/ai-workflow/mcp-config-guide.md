# MCP configuration guide

## Server

- **Name:** `agent-remote-control`
- **Entry:** `node ${workspaceFolder}/packages/mcp-server/dist/index.js`
- **Template:** [.cursor/mcp.example.json](../../.cursor/mcp.example.json)

## Setup

1. `pnpm install && pnpm build` (produces `packages/mcp-server/dist/index.js`).
2. Start the bridge from the VS Code extension (or `pnpm dev:bridge` when CLI exists).
3. Copy `.cursor/mcp.example.json` to `.cursor/mcp.json` (gitignored; do not commit real tokens).
4. Set environment variables on the MCP server entry:
   - `AGENT_REMOTE_BRIDGE_URL` — e.g. `http://127.0.0.1:<port>` from bridge startup
   - `AGENT_REMOTE_BRIDGE_TOKEN` — ephemeral token from bridge (extension shows or writes to env)
5. Set `"disabled": false` in `mcp.json` after the above works.
6. Reload MCP in Cursor settings.

## Security

- Never commit `mcp.json` with a real `AGENT_REMOTE_BRIDGE_TOKEN`.
- Prefer env vars over CLI args for credentials.
- MCP tools must not bypass Telegram pairing or approval queue.

## Failure modes

| Symptom                | Likely cause                                |
| ---------------------- | ------------------------------------------- |
| MCP fails to start     | `dist/` missing — run `pnpm build`          |
| `remote_status` errors | Bridge not running or wrong URL/token       |
| Tools hang on approval | Telegram not paired; check `/status` in bot |

## References

- [Cursor MCP docs](https://cursor.com/docs/mcp)
- [.cursor/rules/60-mcp-server.mdc](../../.cursor/rules/60-mcp-server.mdc)
