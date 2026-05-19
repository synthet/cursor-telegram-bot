---
name: hook-loopback-safety
description: Implement hook event ingestion, normalization, blocking approvals, and loopback queue safety in bridge and hooks packages.
---

# Hook and loopback safety

## Use this skill when

- Working in `packages/hooks` or loopback code in `packages/bridge`
- Defining hook policy or blocking behavior
- Reviewing correlation IDs and replay protection

## Procedure

1. Read `.cursor/rules/70-hooks-and-loopback.mdc` and `.cursor/hooks/hook-policy.json`.
2. **Hooks:** small bin scripts read stdin JSON → normalize to `HookEvent` → POST `/hooks/events` with bridge auth.
3. Map phases: `agent_start`, `before_shell`, `after_shell`, `before_file_edit`, `before_mcp_tool`, `error`, `completion`, etc.
4. **Policy modes:** `observe` | `notify` | `approval` | `block` per event/risk (see hook-policy.json).
5. **Blocking flow:** hook waits for bridge decision → Telegram approval → loopback `approval_decision` → exit code per Cursor hook docs.
6. **Loopback:** per-session queue; validate `source`, `kind`, payload schema; `correlationId` for MCP/hook waiters; expire stale events; audit all deliveries.
7. Distinguish `.cursor/hooks/` (agent policy docs) vs `packages/hooks/` (runtime).
8. Test: stdin parse, bridge unavailable fail-closed, idempotent approval delivery.

References: [Cursor hooks](https://cursor.com/docs/hooks), `docs/ai-workflow/loopback-safety-guide.md`.

## Safety checks

- Hook stdin is untrusted.
- Never deliver expired loopback events.
- Loopback cannot bypass approval queue.

## Done criteria

- Normalized events appear in bridge audit log.
- Blocking hooks respect timeout and deny on expire.
- Loopback tests cover enqueue, deliver, expire, replay rejection.
