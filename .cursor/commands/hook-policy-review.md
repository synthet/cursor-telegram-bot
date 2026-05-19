# Hook policy review

## Goal

Review hook scripts and policy for normalization, blocking behavior, and fail-closed semantics when the bridge is unavailable.

## Context to read

- `.cursor/rules/70-hooks-and-loopback.mdc`
- `.cursor/hooks/hook-policy.json`
- `.cursor/skills/hook-loopback-safety/SKILL.md`
- `packages/hooks/`, bridge hook endpoints
- `docs/ai-workflow/hook-policy-guide.md`

## Steps

1. Compare runtime hook scripts in `packages/hooks/` to `.cursor/hooks/hook-policy.json` defaults.
2. Verify stdin JSON is validated before use.
3. For `approval`/`block` modes: confirm wait timeout, deny on expire, audit trail.
4. Verify hook scripts stay small; no shell interpolation.
5. Confirm distinction: `.cursor/hooks/` = docs; `packages/hooks/` = runtime.
6. Test or describe tests for bridge-down fail-closed.

## Acceptance criteria

- Policy table: event → mode → block capable? → Telegram path?
- Gaps documented with recommended policy change.

## Safety notes

- Hook payloads are untrusted.

## Expected output

Policy matrix + list of issues + recommended test cases.
