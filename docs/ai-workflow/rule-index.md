# Rule index

Cursor rules in `.cursor/rules/`. `alwaysApply: true` rules apply every session; others apply when matching files are open.

| Rule                                                                                 | Scope                                                 | Packages / topics          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------- |
| [00-project-overview.mdc](../../.cursor/rules/00-project-overview.mdc)               | Global                                                | Purpose, public APIs only  |
| [10-architecture-boundaries.mdc](../../.cursor/rules/10-architecture-boundaries.mdc) | Global                                                | Bridge ownership, loopback |
| [20-security-and-secrets.mdc](../../.cursor/rules/20-security-and-secrets.mdc)       | Global                                                | Tokens, pairing, approvals |
| [30-typescript-monorepo.mdc](../../.cursor/rules/30-typescript-monorepo.mdc)         | `packages/**/*.ts`                                    | pnpm, Zod, strict TS       |
| [40-vscode-cursor-extension.mdc](../../.cursor/rules/40-vscode-cursor-extension.mdc) | `packages/vscode-extension/**`, `cursor-extension/**` | SecretStorage, UI          |
| [50-telegram-bot-api.mdc](../../.cursor/rules/50-telegram-bot-api.mdc)               | `packages/telegram-bot/**`                            | Polling, callbacks         |
| [60-mcp-server.mdc](../../.cursor/rules/60-mcp-server.mdc)                           | `packages/mcp-server/**`                              | `remote.*` tools           |
| [70-hooks-and-loopback.mdc](../../.cursor/rules/70-hooks-and-loopback.mdc)           | `packages/hooks/**`, `bridge/**`                      | Hooks, loopback queue      |
| [80-testing-and-quality.mdc](../../.cursor/rules/80-testing-and-quality.mdc)         | `**/*.test.ts`                                        | Vitest, mocks              |
| [90-docs-and-change-control.mdc](../../.cursor/rules/90-docs-and-change-control.mdc) | Global                                                | Docs and asset sync        |
