# Claude Code — Agent Remote Control

## Identity

Local-first **Agent Remote Control**: Telegram + MCP + hooks around a **bridge** on `127.0.0.1`. Monorepo `agent-remote-control`, packages `@agent-remote/*`.

## Quick commands

```bash
pnpm install && pnpm build && pnpm test && pnpm lint
```

## Preferred loop

1. Read relevant `.cursor/rules/*.mdc` (or this file + [AGENTS.md](AGENTS.md)).
2. Touch **one package** per task; use shared Zod types from `@agent-remote/shared`.
3. Add/update tests with Vitest.
4. Run `pnpm test` and `pnpm lint`.
5. End with `.claude/commands/summarize-session.md` output.

## Slash commands (`.claude/commands/`)

| Command | Use when |
|---------|----------|
| `plan` | Break down work before coding |
| `implement` | Build a scoped feature |
| `review-security` | Token leaks, bridge exposure, approval bypass |
| `review-mcp` | MCP tool boundaries and schemas |
| `review-hooks` | Hook policy and blocking behavior |
| `test-telegram` | Telegram flows with mocks |
| `summarize-session` | Handoff notes at end of session |

Cursor equivalents live in `.cursor/commands/`.

## Safety (non-negotiable)

- Telegram token → VS Code **SecretStorage** only.
- Bridge → localhost + per-start bearer token.
- **Zod** at every external boundary.
- **Redact** before any Telegram send.
- **Never** bypass approval/loopback for risky actions.

## Mental model

- **Bridge** owns truth for sessions, approvals, loopback queues.
- **Telegram** is UX + transport; not a workspace editor.
- **MCP** (`agent-remote-control`) is a controlled gateway (`remote.status`, `remote.request_approval`, `remote.ask_user`, etc.).
- **Hooks** publish normalized events; blocking only where Cursor hook semantics allow.
- **Loopback** is the only path for Telegram/MCP/hook events to re-enter a session.

## Skills

Use paired skills under `.claude/skills/` (mirror: `.cursor/skills/`). See [docs/ai-workflow/skill-index.md](docs/ai-workflow/skill-index.md).

## Testing

Mock external I/O. Prefer unit tests for parsers, policies, and schemas before integration tests.

## Session end

Run **summarize-session**: what changed, tests run, security notes, follow-ups, whether MCP/hooks docs need updates.
