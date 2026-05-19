import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  const isCursor =
    (vscode.env.appName ?? "").toLowerCase().includes("cursor") ||
    "cursor" in (vscode as unknown as Record<string, unknown>);

  context.subscriptions.push(
    vscode.commands.registerCommand("agentRemote.cursorDiagnostics", async () => {
      const lines = [
        `Runtime: ${isCursor ? "Cursor" : "VS Code / other"}`,
        `App: ${vscode.env.appName}`,
        `Cursor API key configured: ${Boolean(process.env.CURSOR_API_KEY)}`,
        `Bridge env URL: ${process.env.AGENT_REMOTE_BRIDGE_URL ?? "(not set)"}`,
        "",
        "MCP: Register agent-remote-control in Cursor MCP settings:",
        '  { "mcpServers": { "agent-remote-control": { "command": "node", "args": ["path/to/mcp-server/dist/index.js"], "env": { "AGENT_REMOTE_BRIDGE_URL": "...", "AGENT_REMOTE_BRIDGE_TOKEN": "..." } } } }',
        "",
        "Hooks: Use Agent Remote: Install Cursor Hooks from the base extension.",
      ];
      const doc = await vscode.workspace.openTextDocument({
        content: lines.join("\n"),
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc);
    }),
  );

  if (isCursor) {
    void vscode.window.showInformationMessage(
      "Agent Remote (Cursor): run diagnostics via Agent Remote: Cursor Diagnostics",
    );
  }
}

export function deactivate(): void {}
