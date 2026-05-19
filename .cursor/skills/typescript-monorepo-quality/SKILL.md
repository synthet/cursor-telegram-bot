---
name: typescript-monorepo-quality
description: Maintain pnpm workspace structure, strict TypeScript, shared Zod schemas, builds, lint, and tests across agent-remote packages.
---

# TypeScript monorepo quality

## Use this skill when

- Adding packages, shared types, build config, or cross-package refactors
- Setting up `src/` in scaffold packages

## Procedure

1. Read `.cursor/rules/30-typescript-monorepo.mdc` and root `package.json`, `tsconfig.base.json`.
2. **Workspace:** `pnpm-workspace.yaml` includes `packages/*`; depend on `@agent-remote/shared` via `workspace:*`.
3. **Shared first:** add Zod schemas and types to `packages/shared` before consumers.
4. **Build:** tsup per package → `dist/`; root `pnpm build` runs recursive build.
5. **Strict TS:** extend `tsconfig.base.json`; no implicit any on protocol types.
6. **Lint/format:** ESLint on `packages/`; Prettier on repo.
7. **Tests:** Vitest at root; `*.test.ts` with mocks for I/O.
8. Avoid cycles: `shared` ← adapters ← `bridge` orchestrates `telegram-bot`, not reverse.

## Safety checks

- No secrets in `tsconfig`, test fixtures, or snapshots.
- Bin names: `agent-remote-bridge`, `agent-remote-mcp`, hook bins under `packages/hooks`.

## Done criteria

- `pnpm install && pnpm build && pnpm test && pnpm lint` succeed.
- New code has tests for parsers/schemas touched.
- Package boundaries match architecture rules.
