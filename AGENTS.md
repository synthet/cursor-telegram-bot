# AGENTS.md — Agent Remote Control

Instructions for coding agents working in this repository.

## Overview

**Agent Remote Control** (`agent-remote-control`) is a local-first system to monitor and control Cursor/VS Code agentic coding sessions from Telegram. A VS Code/Cursor extension starts a local **bridge**; a **Telegram bot** delivers commands and approvals; an **MCP server** (`agent-remote-control`) exposes safe tools to agents; **Cursor hooks** observe and gate risky actions; a **loopback dispatcher** routes Telegram/MCP/hook events back into sessions.

## Implementation status

The monorepo has package skeletons (`package.json`, `tsconfig`) under `packages/*`. Application code (`src/`) may be partial or missing—read the tree before assuming APIs exist. Use `.cursor/commands/bootstrap-project.md` to implement from the product spec.

## Architecture

```text
Telegram → telegram-bot → bridge (127.0.0.1, auth token)
                              ├── session registry, approval queue, audit log
                              ├── loopback dispatcher
                              ├── MCP server (stdio)
                              ├── hooks adapter
                              └── agent adapters (Cursor CLI / SDK / noop)
vscode-extension / cursor-extension → spawn bridge, SecretStorage for bot token
```

| Package | Responsibility |
|---------|----------------|
| `@agent-remote/shared` | Zod schemas, types, parsers, redaction |
| `@agent-remote/bridge` | Orchestrator; owns sessions, approvals, loopback |
| `@agent-remote/telegram-bot` | Bot API client; polling default; no direct workspace access |
| `@agent-remote/mcp-server` | MCP tools `remote.*`; connects to bridge only |
| `@agent-remote/hooks` | Runtime hook scripts → bridge |
| `@agent-remote/vscode-extension` | VS Code UI, bridge lifecycle, secrets |
| `@agent-remote/cursor-extension` | Thin Cursor-specific layer |

Deeper docs: [docs/architecture.md](docs/architecture.md), [docs/ai-workflow/](docs/ai-workflow/).

## Setup and commands

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm format:check
pnpm dev:bridge    # when bridge src exists
```

Node **>= 20**. Package manager: **pnpm 9**.

## Code style

- TypeScript **strict**; **Zod** for every boundary payload (Telegram, MCP, hooks, RPC, loopback).
- Small modules; dependency injection for testability.
- Match existing naming: `@agent-remote/*`, `agent-remote-*` bins.
- Prefer explicit `AgentAdapter` implementations over ad hoc process control.

## Package boundaries

**Do**

- Put orchestration in `bridge`.
- Keep Telegram formatting/parsing in `telegram-bot`.
- Expose only policy-wrapped MCP tools in `mcp-server`.
- Keep hook scripts tiny; normalize events in shared/bridge.
- Store Telegram token in extension **SecretStorage** only.

**Do not**

- Let `telegram-bot` mutate the workspace or spawn shells directly.
- Put session logic in the extension beyond bridge RPC.
- Add MCP tools that run shell/file ops without approval policy.
- Use private Cursor internals, UI scraping, or undocumented DB formats.

## Security (hard rules)

1. **Public APIs only** — VS Code Extension API, documented Cursor extension API, Cursor CLI, documented hooks, MCP.
2. **Secrets** — Telegram token and bridge auth token never in repo, `settings.json`, logs, audit logs, or Telegram messages.
3. **Bridge** — Bind `127.0.0.1` by default; require auth token on all RPC except `/health`.
4. **Approvals** — High-risk shell, git push/reset, deletes, out-of-workspace writes, secret file access, deploy commands require explicit user approval via Telegram or policy.
5. **Redaction** — All outbound Telegram content (logs, diffs, hooks) passes redaction helpers.
6. **Loopback** — Session-scoped, authorized, idempotent, audited; never bypass approval queue.
7. **Untrusted input** — Treat Telegram callbacks, hook stdin, and MCP tool args as hostile.

See [docs/security.md](docs/security.md) and `.cursor/rules/20-security-and-secrets.mdc`.

## Testing

- **Vitest** at repo root; tests colocated as `*.test.ts`.
- Mock Telegram HTTP, bridge RPC, and child processes in unit tests.
- Cover: command parser, callbacks, redaction, MCP schemas, hook normalization, loopback enqueue/deliver/expire.

## Change control

- Update `docs/architecture.md` and security docs when changing boundaries or threat model.
- Keep `.cursor/skills/` and `.claude/skills/` in sync (see [docs/ai-workflow/skill-index.md](docs/ai-workflow/skill-index.md)).
- Do not commit `.env` with secrets; use [.env.example](.env.example) for non-secret defaults.

## Prohibited behaviors

- Logging or committing Telegram bot tokens, bridge tokens, or API keys.
- Exposing bridge on `0.0.0.0` without explicit documented opt-in.
- Shell commands via string interpolation (use `execFile` / argv arrays).
- Encoding secrets or full prompts in Telegram `callback_data`.
- Bypassing approval or loopback for “convenience.”

## AI workspace assets

| Asset | Location |
|-------|----------|
| Cursor rules | `.cursor/rules/*.mdc` |
| Cursor commands | `.cursor/commands/*.md` |
| Cursor skills | `.cursor/skills/*/SKILL.md` |
| MCP template | `.cursor/mcp.example.json` |
| Hook policy (docs) | `.cursor/hooks/` |
| Claude commands | `.claude/commands/*.md` |
| Claude skills | `.claude/skills/*/SKILL.md` |
| Workflow index | [docs/ai-workflow/README.md](docs/ai-workflow/README.md) |
