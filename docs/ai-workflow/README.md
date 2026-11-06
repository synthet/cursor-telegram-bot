# AI workflow assets

This directory indexes project-specific instructions for Cursor, Claude Code, and other coding agents working on **Agent Remote Control**.

## What was generated

| Asset              | Location                                                           |
| ------------------ | ------------------------------------------------------------------ |
| Agent contract     | [AGENTS.md](../../AGENTS.md)                                       |
| Claude memory      | [CLAUDE.md](../../CLAUDE.md)                                       |
| Cursor rules       | [.cursor/rules/](../../.cursor/rules/)                             |
| Cursor commands    | [.cursor/commands/](../../.cursor/commands/)                       |
| Cursor skills      | [.cursor/skills/](../../.cursor/skills/)                           |
| Claude commands    | [.claude/commands/](../../.claude/commands/)                       |
| Claude skills      | [.claude/skills/](../../.claude/skills/) — mirror of Cursor skills |
| MCP template       | [.cursor/mcp.example.json](../../.cursor/mcp.example.json)         |
| Hook policy (docs) | [.cursor/hooks/](../../.cursor/hooks/)                             |

## Quick start for agents

1. Read [AGENTS.md](../../AGENTS.md) and [docs/architecture.md](../architecture.md).
2. Apply rules in `.cursor/rules/` (auto-loaded in Cursor).
3. Pick a skill from [skill-index.md](skill-index.md) for your task area.
4. Use a command from [command-index.md](command-index.md) for bootstrap, review, or release.

## Indexes

- [Integration tooling research](../research/integration-tooling-research.md) — external agents, verification, phased roadmap
- [rule-index.md](rule-index.md)
- [command-index.md](command-index.md)
- [skill-index.md](skill-index.md)
- [mcp-config-guide.md](mcp-config-guide.md)
- [hook-policy-guide.md](hook-policy-guide.md)
- [loopback-safety-guide.md](loopback-safety-guide.md)
- [agent-roles.md](agent-roles.md)
- [review-checklists.md](review-checklists.md)

## Follow-up TODOs (human)

1. Run `.cursor/commands/bootstrap-project.md` to implement `packages/*/src`.
2. `pnpm build` then copy `.cursor/mcp.example.json` → `.cursor/mcp.json` (gitignored locally if preferred); set bridge URL/token; set `disabled: false`.
3. Keep `.cursor/skills/` and `.claude/skills/` in sync when editing skills.
4. Expand `docs/setup.md` as extension and bridge features land.

## Assumptions

- Monorepo scaffold exists; application code may be incomplete.
- MCP server uses stdio and `${workspaceFolder}` path after build.
- No secrets are committed in generated assets.
