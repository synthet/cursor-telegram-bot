# Review checklists

## Security review

- [ ] No tokens/keys in code, logs, tests, or docs
- [ ] Telegram token only in SecretStorage
- [ ] Bridge localhost + bearer auth on RPC
- [ ] Pairing: TTL, single-use, rate limit
- [ ] Redaction on all Telegram-bound text
- [ ] No approval/loopback bypass
- [ ] Shell spawn uses argv array

## Telegram bot review

- [ ] `answerCallbackQuery` always called
- [ ] Polling offset correct; webhook/polling conflict handled (409)
- [ ] 429 respects `retry_after`
- [ ] Unauthorized chats rejected
- [ ] No secrets in `callback_data`
- [ ] Message chunking and HTML escape

## MCP tool review

- [ ] Each tool has Zod input/output in shared
- [ ] Bridge auth on every call
- [ ] `request_approval` / `ask_user` use correlation + timeout
- [ ] No raw shell/file tools without policy
- [ ] Resources omit secrets

## Hook policy review

- [ ] stdin validated; scripts minimal
- [ ] Policy matches `.cursor/hooks/hook-policy.json`
- [ ] Fail-closed when bridge down (per policy)
- [ ] Blocking hooks respect timeout

## Loopback review

- [ ] Dispatcher only delivery path
- [ ] Idempotency for approvals/callbacks
- [ ] Expiry enforced
- [ ] Audit entries redacted

## Extension review

- [ ] Commands registered in package.json contributes
- [ ] No session logic duplicated from bridge
- [ ] Hook install asks user confirmation
- [ ] Status bar reflects bridge/MCP/hooks state

## TypeScript package review

- [ ] Schemas in `shared` first
- [ ] No package cycles
- [ ] `pnpm build test lint` pass
- [ ] Tests mock I/O

## Release review

- [ ] README links valid
- [ ] `mcp.example.json` disabled or documented
- [ ] No `.env` committed
- [ ] Known limitations in `docs/security.md`
- [ ] Version/changelog if shipping extension
