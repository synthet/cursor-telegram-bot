# Agent roles

Recommended focus areas when splitting work across subagents or sessions.

## Architecture Agent

- **Owns:** cross-package design, `docs/architecture.md`, shared protocol types
- **Checks:** boundary violations, adapter interfaces
- **Avoid:** Telegram HTML formatting, extension UI details

## Security Agent

- **Owns:** `docs/security.md`, threat model, redaction, pairing, transport auth
- **Checks:** [review-checklists.md](review-checklists.md) Security section
- **Avoid:** feature implementation unless fixing security defects

## Extension Agent

- **Owns:** `packages/vscode-extension`, `packages/cursor-extension`
- **Checks:** SecretStorage, bridge spawn, commands manifest
- **Avoid:** bridge session registry logic

## Telegram Bot Agent

- **Owns:** `packages/telegram-bot`
- **Checks:** polling offset, callbacks, rate limits, escaping
- **Avoid:** direct workspace or shell access

## MCP Agent

- **Owns:** `packages/mcp-server`, `.cursor/mcp.example.json`
- **Checks:** Zod tool schemas, bridge auth, no dangerous tools
- **Avoid:** hook script implementation

## Hooks / Loopback Agent

- **Owns:** `packages/hooks`, loopback dispatcher in bridge
- **Checks:** policy JSON alignment, fail-closed, correlation IDs
- **Avoid:** Telegram message templates

## Test Agent

- **Owns:** Vitest suites, mocks, coverage gaps
- **Checks:** `pnpm test`, no live Telegram
- **Avoid:** production config changes

## Documentation Agent

- **Owns:** `docs/*`, `docs/ai-workflow/*`, README accuracy
- **Checks:** links, sync skills mirror
- **Avoid:** large refactors without architecture sign-off

## Release Agent

- **Owns:** release checklist, version bumps, extension packaging
- **Checks:** [.cursor/commands/release-check.md](../../.cursor/commands/release-check.md)
- **Avoid:** new features during release freeze
