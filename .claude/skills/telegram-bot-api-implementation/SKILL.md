---
name: telegram-bot-api-implementation
description: Implement or review Telegram Bot API polling, webhooks, callbacks, keyboards, and command handling for agent-remote telegram-bot package.
---

# Telegram Bot API implementation

## Use this skill when

- Working in `packages/telegram-bot`
- Adding commands, inline keyboards, polling, or webhook mode
- Fixing 409/429 errors, offset bugs, or callback handling

## Procedure

1. Read `.cursor/rules/50-telegram-bot-api.mdc` and `packages/telegram-bot/`.
2. Follow [Telegram Bot API](https://core.telegram.org/bots/api):
   - HTTPS `https://api.telegram.org/bot<token>/<method>`
   - Model responses with `ok` + `result` | error
3. **Polling (default):** `getUpdates` with `timeout: 25`, `limit: 50`, `allowed_updates: ["message","callback_query","my_chat_member"]`; track `update_id` offset; call `deleteWebhook` before polling if needed.
4. **Webhook (optional):** `setWebhook` with HTTPS, `secret_token`, validate `X-Telegram-Bot-Api-Secret-Token`; document mutual exclusion with polling.
5. **Callbacks:** format `v1:<kind>:<action>:<id>:<nonce>`; always `answerCallbackQuery`; validate chat, nonce, expiry server-side.
6. **Messages:** HTML escape user content; chunk at 4096; redact via `@agent-remote/shared` before send.
7. **Commands:** `/start`, `/help`, `/pair`, `/status`, `/sessions`, `/new`, `/ask`, `/approve`, `/deny`, `/logs`, `/diff`, `/stop`, `/mcp`, `/hooks`, `/loopback`, `/settings` — delegate actions to bridge RPC.
8. Add Vitest tests with mocked HTTP; cover unauthorized chat, 409, 429 retry.

## Safety checks

- Token never logged or committed.
- No secrets in `callback_data`.
- Private chats only unless explicitly configured.
- Rate limits on pairing and commands.

## Done criteria

- Polling offset cannot duplicate or skip updates.
- Every callback acknowledged.
- Unauthorized chats rejected and audited.
- Tests pass for parser, callbacks, and error paths.
