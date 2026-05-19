# Loopback safety guide

## Definition

**Loopback** routes external events (Telegram, MCP, hooks, extension) back into the active agent session through the bridge **loopback dispatcher** — the only supported return path.

## Event model

Each `LoopbackEvent` includes:

- `sessionId`, `source`, `kind`, `payload` (schema-validated per kind)
- Optional `correlationId` for MCP `ask_user` and approvals
- `status`: `queued` → `delivered` → `acknowledged` | `failed` | `expired`

## Rules

1. **Authorize** — paired Telegram chat, bridge auth token, valid session.
2. **Idempotent** — duplicate Telegram callbacks must not double-apply decisions.
3. **Expire** — stale events are not delivered.
4. **Audit** — every enqueue and delivery logged (redacted).
5. **No bypass** — loopback cannot skip approval policy for risky actions.

## Examples

| Flow | Path |
|------|------|
| `/ask sess_123 hi` | Telegram → bridge → loopback `user_message` → agent adapter |
| `remote.ask_user` | MCP waiter → Telegram → reply → loopback with `correlationId` |
| Hook shell approval | hook → approval → Telegram → `approval_decision` → hook unblock |
| `/stop sess_123` | loopback `cancel` → adapter.stopSession |

## Implementation

Code belongs in `packages/bridge` (dispatcher) and `@agent-remote/shared` (schemas). See `.cursor/rules/70-hooks-and-loopback.mdc`.
