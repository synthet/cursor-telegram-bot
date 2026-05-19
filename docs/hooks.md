# Cursor Hooks

## Installation

Run **Agent Remote: Install Cursor Hooks** in the extension. Review the generated config before merging into `.cursor/hooks.json`.

## Binaries

- `agent-remote-hook`
- `agent-remote-before-shell` / `after-shell`
- `agent-remote-before-file-edit` / `after-file-edit`
- `agent-remote-before-tool` / `after-tool`

## Policy modes

`observe` | `notify` | `approval` | `block` — defaults: shell/file-edit before hooks use approval for medium+ risk.

## Blocking

`before-shell` and `before-file-edit` can block until Telegram approval when bridge is available; fail closed if bridge is down and hook is blocking.

## Env

- `AGENT_REMOTE_BRIDGE_URL`
- `AGENT_REMOTE_BRIDGE_TOKEN`
