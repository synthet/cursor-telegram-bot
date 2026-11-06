# Architecture

Local-first control plane for Cursor/VS Code agentic sessions.

## Diagram

```text
Telegram User
    |
    v
Telegram Bot Adapter (packages/telegram-bot)
    |
    v
Local Bridge (packages/bridge) — 127.0.0.1 + auth token
    |-- Session registry
    |-- Approval queue
    |-- Audit log
    |-- Event bus
    |-- Loopback dispatcher
    |-- Agent adapters (Cursor CLI / SDK / noop)
    |-- MCP server lifecycle coordination
    |-- Hook event ingestion
    |
    v
VS Code / Cursor (packages/vscode-extension, cursor-extension)
    |
    v
Workspace + agents (CLI / MCP / hooks)
```

## Packages

| Package                         | Role                                        |
| ------------------------------- | ------------------------------------------- |
| `@agent-remote/shared`          | Zod schemas, types, parsers, redaction      |
| `@agent-remote/bridge`          | Orchestrator; sessions, approvals, loopback |
| `@agent-remote/telegram-bot`    | Bot API; polling default                    |
| `@agent-remote/mcp-server`      | MCP `agent-remote-control` (stdio)          |
| `@agent-remote/hooks`           | Hook scripts → bridge                       |
| `agent-remote-vscode-extension` | UI, secrets, bridge lifecycle               |
| `agent-remote-cursor-extension` | Cursor-specific thin layer                  |

## Design constraints

- **Public APIs only** — no private Cursor internals or UI scraping.
- **Bridge owns orchestration** — Telegram and extension do not mutate the workspace directly.
- **MCP** exposes policy-wrapped tools (`remote.*`), not raw shell/file access.
- **Loopback** is the only path for Telegram/MCP/hook events to re-enter sessions.

## v1 limitations

- No cloud relay; Telegram talks to your machine (polling or self-hosted webhook).
- No guarantee of controlling pre-existing GUI agent chats without documented APIs.
- Fallback: Cursor CLI / MCP / hooks for sessions started by this system.

Optional agent backends, verification runners, and security gates beyond Cursor CLI/SDK are phased per [research/integration-tooling-research.md](research/integration-tooling-research.md).

## AI agents

See [ai-workflow/README.md](ai-workflow/README.md) and [AGENTS.md](../AGENTS.md).
