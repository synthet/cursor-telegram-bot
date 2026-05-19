# Telegram Bot

## Polling (default)

Local dev uses `getUpdates` long polling (`timeout: 25`, tracked `offset`). Webhook is deleted automatically before polling starts.

## Callback queries

Always answered via `answerCallbackQuery`. Callback data format: `v1:<kind>:<action>:<id>:<nonce>` (max 64 bytes).

## Formatting

HTML parse mode with escaped user content. Logs/diffs chunked under 4096 characters.

## Commands

`/start`, `/help`, `/pair`, `/status`, `/sessions`, `/new`, `/ask`, `/approve`, `/deny`, `/logs`, `/diff`, `/stop`, `/workspace`, `/mcp`, `/hooks`, `/loopback`, `/settings`
