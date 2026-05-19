# Troubleshooting

## Telegram 409 conflict

Webhook and polling are mutually exclusive. The bot deletes the webhook before polling. Run `/status` after restart.

## Bridge not running

Start from **Agent Remote: Start Bridge**. Check the status bar and Output panel.

## No agent adapter

Install Cursor CLI or set `CURSOR_API_KEY` for the SDK adapter. `/new` will return setup guidance with the noop adapter.

## MCP tools fail

Ensure `AGENT_REMOTE_BRIDGE_URL` and `AGENT_REMOTE_BRIDGE_TOKEN` match the running bridge (printed on start).

## Hooks block everything

If the bridge is down, blocking hooks fail closed. Start the bridge or switch hook policy to `observe` in docs/hooks.md.
