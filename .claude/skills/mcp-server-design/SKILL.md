---
name: mcp-server-design
description: Design and implement the agent-remote-control MCP server tools, resources, prompts, and bridge-authenticated transport.
---

# MCP server design

## Use this skill when

- Working in `packages/mcp-server`
- Adding `remote.*` tools, resources, or prompts
- Configuring `.cursor/mcp.example.json`

## Procedure

1. Read `.cursor/rules/60-mcp-server.mdc` and [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25).
2. Use `@modelcontextprotocol/sdk`; server name **`agent-remote-control`**.
3. **Transport:** stdio default; env `AGENT_REMOTE_BRIDGE_URL`, `AGENT_REMOTE_BRIDGE_TOKEN` (never CLI args for secrets).
4. **Tools (Zod I/O):**
   - `remote.status` — bridge/session snapshot
   - `remote.notify` — paired chat notification (redacted, rate limited)
   - `remote.request_approval` — Telegram inline approve/deny + wait
   - `remote.ask_user` — question + optional choices; correlate reply
   - `remote.checkpoint`, `remote.report_diff`, `remote.loopback_enqueue`
5. **Resources:** `agent-remote://sessions`, approvals, recent events, config status — no secrets.
6. **Prompts:** `remote-safe-plan`, `remote-approval-required`, `remote-session-summary`, `remote-diff-summary`.
7. On bridge down: return structured diagnostics, do not throw opaque errors.
8. Test tool handlers with mocked bridge HTTP.

## Safety checks

- No raw shell/file/network tools without approval policy.
- All tool inputs validated with Zod.
- Paired-chat-only for notify/approval/ask_user.

## Done criteria

- Tool list matches schemas in `@agent-remote/shared`.
- Bridge auth required on every bridge call.
- `pnpm build` produces `dist/index.js` for MCP config path.

References: [Cursor MCP docs](https://cursor.com/docs/mcp), [Cursor CLI MCP](https://cursor.com/docs/cli/mcp).
