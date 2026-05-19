# Implement feature

## Goal

Implement **one** scoped feature in **one** package with tests, without violating architecture boundaries.

## Context to read

- [AGENTS.md](../../AGENTS.md)
- Relevant `.cursor/rules/*.mdc` for the target package
- Matching `.cursor/skills/*/SKILL.md`
- Existing code in the target `packages/<name>/`

## Steps

1. Restate the feature scope and owning package (user request or $ARGUMENTS).
2. Confirm schemas exist in `@agent-remote/shared`; add Zod types there first if needed.
3. Implement minimal change in the owning package only.
4. Wire through bridge RPC if the feature crosses Telegram/MCP/hooks/extension.
5. Add/update Vitest tests; mock external I/O.
6. Run `pnpm test` and `pnpm lint` for affected packages.

## Acceptance criteria

- Feature works as specified or documents blocker with fallback behavior.
- No secrets logged; approvals/loopback respected for risky paths.
- Tests added for new logic.

## Safety notes

- Do not bypass approval queue or loopback dispatcher.
- Telegram/MCP/hook inputs are untrusted.

## Expected output

- Files changed (list)
- Behavior summary
- Test results
- Follow-ups if any
