---
name: vscode-cursor-extension
description: Implement VS Code/Cursor extension commands, SecretStorage, bridge process manager, status bar, tree view, and webview for agent-remote.
---

# VS Code / Cursor extension

## Use this skill when

- Working in `packages/vscode-extension` or `packages/cursor-extension`
- Adding commands, UI, or bridge spawn logic

## Procedure

1. Read `.cursor/rules/40-vscode-cursor-extension.mdc`.
2. Reference [VS Code Extension API](https://code.visualstudio.com/api) and [Cursor extension API](https://cursor.com/docs/extension-api) (documented surfaces only).
3. **Secrets:** `context.secrets` for Telegram token; never `settings.json`.
4. **Bridge:** spawn `agent-remote-bridge` with argv array; pass ephemeral token via env; surface errors in status bar.
5. **Commands:** `agentRemote.startBridge`, `stopBridge`, `generatePairingCode`, `configureTelegramToken`, `showDashboard`, `installCursorHooks`, etc.
6. **UI:** status bar (bridge, paired, MCP, hooks, sessions, approvals); tree sections; webview dashboard read-only from bridge RPC.
7. **Cursor layer:** `cursor-extension` only for Cursor diagnostics/MCP registration helpers — no duplicated session logic.
8. Mock `ExtensionContext`, `SecretStorage`, and child_process in tests.

## Safety checks

- Extension does not implement approval/session registry locally.
- No token in `globalState` or logs.
- User confirmation before writing hook config to disk.

## Done criteria

- Commands registered in `package.json` contributes.
- Bridge start/stop works against local bridge when implemented.
- Cursor-specific code isolated in `cursor-extension`.
