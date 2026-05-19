# Loopback

Per-session queues route Telegram, MCP, hook, and extension events back into the agent adapter.

## Examples

- `/ask sess_123 run tests` → `user_message` → adapter `sendMessage`
- MCP `remote.ask_user` → Telegram question → user reply → MCP result
- Hook shell approval → `approval_decision` → hook unblocks
- `/stop sess_123` → `cancel` → `stopSession`

## Security

Session-scoped, correlation IDs, expiring events, audited actions.
