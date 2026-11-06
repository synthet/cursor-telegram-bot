# Cursor Integration

## v1 supported

- VS Code-compatible extension APIs
- Bridge-spawned agent sessions (Cursor CLI or `@cursor/sdk` when available)
- MCP server `agent-remote-control` (stdio)
- Cursor hooks via hook scripts + bridge ingestion
- Telegram pairing and approvals

## Not supported

- Controlling existing GUI agent chats without a documented API
- Private / undocumented Cursor internals
- Cloud relay

## Adapters (implemented)

Registered in `packages/bridge/src/adapters/registry.ts`; contract in `packages/shared/src/agent-adapter.ts`.

| Adapter        | When used                                    | Package           |
| -------------- | -------------------------------------------- | ----------------- |
| **Cursor CLI** | `cursor` or `agent` on PATH                  | `cli-adapter.ts`  |
| **Cursor SDK** | `CURSOR_API_KEY` and `@cursor/sdk` available | `sdk-adapter.ts`  |
| **Noop**       | Fallback; setup guidance only                | `noop-adapter.ts` |

## Adapters (planned)

See [research/integration-tooling-research.md](research/integration-tooling-research.md) for evaluation, timing, and official references.

| Adapter                      | Timing        | Notes                                                       |
| ---------------------------- | ------------- | ----------------------------------------------------------- |
| **OpenAI Codex**             | planned-v1    | IDE extension; Cursor-compatible                            |
| **Anthropic Claude Code**    | planned-v1    | CLI or VS Code extension; hooks/MCP align with this project |
| **Gemini CLI / Code Assist** | planned-later | Secondary backend                                           |
| **GitHub Copilot CLI**       | planned-later | Reference for remote session semantics; GitHub coupling     |

Verification and CI adapters (Vitest runner extension, Playwright, Semgrep, Trivy, GitHub Actions relay) are also documented there as **planned-v1** bridge runners—not agent backends.
