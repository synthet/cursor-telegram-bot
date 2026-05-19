# Bootstrap project

## Goal

Implement or extend the Agent Remote Control monorepo from the product spec when packages lack `src/` or features are incomplete.

## Context to read

- [AGENTS.md](../../AGENTS.md)
- [docs/architecture.md](../../docs/architecture.md)
- `.cursor/rules/00-project-overview.mdc`, `10-architecture-boundaries.mdc`, `30-typescript-monorepo.mdc`
- All `packages/*/package.json`
- Product spec (architecture, shared schemas, bridge RPC, Telegram, MCP, hooks sections)

## Steps

1. Inventory existing `packages/*/src` vs skeleton-only packages.
2. Implement `packages/shared` first: Session, Approval, HookEvent, LoopbackEvent, MCP tool schemas, Telegram command parser, redaction.
3. Bridge skeleton: `/health`, auth middleware, pairing, event bus, audit log, loopback queue stubs.
4. Telegram: polling client, `/start`, `/help`, `/status`, `/pair`.
5. MCP: stdio server, `remote.status` only, then remaining tools incrementally.
6. Hooks: one sample hook script + bridge ingestion endpoint.
7. Extension: register commands, SecretStorage wrapper, bridge spawn/stop, status bar.
8. Add Vitest tests per package touched.
9. Run `pnpm build && pnpm test && pnpm lint`.

## Acceptance criteria

- Monorepo builds without errors.
- Tests cover shared parsers and at least one integration path per major package.
- No secrets committed; bridge binds localhost.

## Safety notes

- Public APIs only; no private Cursor internals.
- Zod at every boundary.

## Expected output

Markdown summary: phases completed, mocked vs real, remaining work, test commands run.
