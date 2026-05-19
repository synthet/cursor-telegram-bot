# MCP tool review

## Goal

Review MCP server changes for capability boundaries, Zod schemas, bridge auth, and abuse resistance.

## Context to read

- `.cursor/rules/60-mcp-server.mdc`
- `.cursor/skills/mcp-server-design/SKILL.md`
- `packages/mcp-server/`, `packages/shared/` (MCP schemas)
- `docs/ai-workflow/review-checklists.md` (MCP section)

## Steps

1. List all tools/resources/prompts added or changed.
2. For each tool: verify Zod input/output, no secret fields in responses, bridge auth on calls.
3. Confirm `remote.request_approval` and `remote.ask_user` use pairing + correlation IDs.
4. Confirm rate limits and redaction on `remote.notify`.
5. Verify no arbitrary shell/file/network escape hatches.
6. Check `.cursor/mcp.example.json` still has no real tokens.

## Acceptance criteria

- Every tool mapped to bridge RPC with documented failure modes.
- Abuse cases noted (unpaired chat, bridge down, timeout).

## Safety notes

- MCP tool calls are untrusted.

## Expected output

Table: Tool | Risk | Auth | Schema OK | Issues
