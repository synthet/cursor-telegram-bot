# Release check

## Goal

Run pre-release validation for Agent Remote Control: build, test, lint, docs, extension packaging readiness.

## Context to read

- [AGENTS.md](../../AGENTS.md)
- `package.json`, all `packages/*/package.json`
- `docs/setup.md`, `docs/security.md`
- `docs/ai-workflow/review-checklists.md` (Release section)

## Steps

1. `pnpm install`
2. `pnpm build`
3. `pnpm test`
4. `pnpm lint` and `pnpm format:check`
5. Verify README links resolve.
6. Grep repo for accidental secrets (tokens, `sk-`, `ghp_`, private keys).
7. Confirm `.cursor/mcp.example.json` has `disabled: true` or docs say to enable manually.
8. Extension: `vsce package` readiness (manifest, commands, version bump if releasing).
9. Summarize known limitations from `docs/security.md`.

## Acceptance criteria

- All commands pass or failures explained with blockers.
- No secrets in tree.
- Version/changelog noted if applicable.

## Safety notes

- Do not publish tokens or `.env` files.

## Expected output

Checklist with pass/fail per item + ship/no-ship recommendation.
