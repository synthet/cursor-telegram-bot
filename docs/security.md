# Security

Agent Remote can influence local code execution and receive commands from Telegram. Treat it as sensitive infrastructure.

## Threat model (summary)

| Threat                         | Mitigation                                      |
| ------------------------------ | ----------------------------------------------- |
| Stolen Telegram account / chat | Pairing codes, allowlisted chat, rate limits    |
| Network access to bridge       | Bind `127.0.0.1`, random per-start bearer token |
| Malicious MCP tool usage       | Tool allowlist, approvals, no raw shell tools   |
| Hook payload injection         | Validate JSON; minimal scripts; no eval         |
| Secret leakage via Telegram    | Redaction pipeline on logs/diffs/messages       |
| Callback replay                | Nonces, expiry, idempotent approval handling    |

## Secret handling

- **Telegram bot token:** VS Code SecretStorage only — never repo, settings, logs, or audit files.
- **Bridge token:** Ephemeral per bridge start; pass via env to MCP, not CLI args.
- **Do not commit:** `.env` with secrets; use [.env.example](../.env.example) for non-secret defaults.

## Pairing

1. User generates short-lived code in extension.
2. User sends `/pair <code>` in Telegram private chat.
3. Bridge validates TTL, single-use, rate limit; stores authorized `chat_id`.

## Approvals

Required for high-risk actions: shell, installs, git push/reset, deletes, out-of-workspace writes, secret files, deploy, high-risk MCP/hook events. Telegram inline keyboard with server-validated `callback_data` (`v1:...` + nonce).

## MCP safety

Tools connect only to authenticated local bridge. `remote_request_approval` and `remote_ask_user` block until decision or timeout. No bypass of queue via `remote_loopback_enqueue`.

## Hooks safety

Untrusted stdin. Fail-closed when bridge unavailable for configured high-risk hooks. See [.cursor/hooks/hook-policy.json](../.cursor/hooks/hook-policy.json).

## Loopback safety

Session-scoped, authorized, audited, expiring events. See [ai-workflow/loopback-safety-guide.md](ai-workflow/loopback-safety-guide.md).

## Agent rules

Enforced in [.cursor/rules/20-security-and-secrets.mdc](../.cursor/rules/20-security-and-secrets.mdc) and [AGENTS.md](../AGENTS.md).

## Known limitations

- Compromised paired Telegram chat can approve actions — protect Telegram account.
- Local machine compromise bypasses network controls on bridge.
- Controlling arbitrary pre-opened Cursor GUI sessions is not a v1 goal.
