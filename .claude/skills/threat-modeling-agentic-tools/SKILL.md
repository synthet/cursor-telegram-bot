---
name: threat-modeling-agentic-tools
description: Threat-model remote control, Telegram compromise, bridge exposure, MCP abuse, hook injection, and secret leakage for agent-remote.
---

# Threat modeling (agentic remote control)

## Use this skill when

- Security reviews, new features touching Telegram/MCP/hooks/bridge
- Writing or updating `docs/security.md`
- Running `.cursor/commands/security-review.md`

## Procedure

1. Read `docs/security.md`, `.cursor/rules/20-security-and-secrets.mdc`, and `docs/ai-workflow/review-checklists.md`.
2. **Assets:** bot token, bridge token, pairing codes, workspace files, agent sessions, audit log.
3. **Threats:**
   - Stolen Telegram chat → paired chat bypass? (mitigate: pairing, single-chat allowlist, rate limits)
   - Local network attacker → bridge RPC? (mitigate: localhost bind, bearer token)
   - Malicious MCP tool caller → arbitrary ops? (mitigate: tool allowlist, approval, no raw shell tools)
   - Hook payload injection → RCE? (mitigate: validate JSON, no eval, minimal hook scripts)
   - Log exfiltration via Telegram → secrets in logs? (mitigate: redaction pipeline)
   - Callback replay → duplicate approve? (mitigate: nonce, expiry, idempotency)
4. Document **fail-closed** behavior for each path.
5. List **known limitations** (no control of pre-existing GUI chats without documented API).

## Safety checks

- Every new external input has a Zod schema and abuse note.
- Approval required for listed high-risk action types.

## Done criteria

- Review output lists threats, mitigations, gaps, and recommended tests.
- No undocumented secret storage locations.
