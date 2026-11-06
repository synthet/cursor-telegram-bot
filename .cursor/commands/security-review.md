# Security review

## Goal

Review the current diff or specified paths for token leaks, remote-control risks, approval bypass, and local transport exposure.

## Context to read

- [docs/security.md](../../docs/security.md)
- `.cursor/rules/20-security-and-secrets.mdc`
- `.cursor/skills/threat-modeling-agentic-tools/SKILL.md`
- `docs/ai-workflow/review-checklists.md` (Security section)

## Steps

1. Identify changed files (git diff or user scope).
2. Search for: hardcoded tokens, `console.log` of secrets, bridge on non-localhost, missing auth on RPC, shell string interpolation.
3. Verify Telegram token path uses SecretStorage only.
4. Verify MCP tools do not expose raw dangerous operations.
5. Verify loopback/approval cannot be skipped.
6. Check redaction on Telegram-bound strings.
7. Rate limiting and pairing on new endpoints.

## Acceptance criteria

- Findings classified: critical / high / medium / low / informational.
- Each critical/high has a concrete fix suggestion.

## Safety notes

- Do not request or paste real tokens in the review output.

## Expected output

```md
## Security review

### Critical

- ...

### High

- ...

### Passed checks

- ...

### Recommended tests

- ...
```
