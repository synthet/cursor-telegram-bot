# Hook policy guide

## Two hook locations

| Path                                     | Role                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| [.cursor/hooks/](../../.cursor/hooks/)   | Policy JSON + **example** payloads for agents/reviewers |
| [packages/hooks/](../../packages/hooks/) | **Runtime** hook scripts (Node bins → bridge)           |

Do not confuse Cursor’s user/workspace hooks config (installed by the extension) with this docs folder.

## Policy file

[.cursor/hooks/hook-policy.json](../../.cursor/hooks/hook-policy.json) defines default modes:

- `observe` — log/audit only
- `notify` — Telegram notification
- `approval` — wait for user via Telegram + loopback
- `block` — deny unless approved (where hook API supports blocking)

`bridgeUnavailable` defines fail-closed behavior (e.g. block `before_shell`).

## Runtime flow

1. Cursor invokes hook script with JSON on stdin.
2. Script normalizes to `HookEvent` and POSTs to bridge `/hooks/events`.
3. Bridge may create approval → Telegram inline keyboard.
4. User decision → loopback `approval_decision` → hook exit code.

## Examples

See [.cursor/hooks/examples/](../../.cursor/hooks/examples/) — fake session IDs only.

## Review

Use [.cursor/commands/hook-policy-review.md](../../.cursor/commands/hook-policy-review.md) and [review-checklists.md](review-checklists.md).

References: [Cursor hooks](https://cursor.com/docs/hooks)
