import * as vscode from "vscode";
import { BridgeProcessManager } from "./bridge-manager.js";
import { ExtensionBridgeApi } from "./bridge-api.js";
import { AgentRemoteTreeProvider } from "./tree-provider.js";

const SECRET_TELEGRAM = "agentRemote.telegramToken";

let extensionContext: vscode.ExtensionContext;
let bridgeManager: BridgeProcessManager;
let bridgeApi: ExtensionBridgeApi;
let statusBar: vscode.StatusBarItem;
let treeProvider: AgentRemoteTreeProvider;

export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context;
  bridgeManager = new BridgeProcessManager(context.extensionPath, (key) =>
    context.secrets.get(key),
  );

  bridgeApi = new ExtensionBridgeApi(() => bridgeManager.state);
  treeProvider = new AgentRemoteTreeProvider(bridgeApi);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "agentRemote.showDashboard";
  context.subscriptions.push(statusBar);

  vscode.window.createTreeView("agentRemoteTree", {
    treeDataProvider: treeProvider,
  });

  const commands: Array<[string, () => Promise<void>]> = [
    ["agentRemote.startBridge", () => startBridge()],
    ["agentRemote.stopBridge", () => stopBridge()],
    ["agentRemote.restartBridge", () => restartBridge()],
    ["agentRemote.showDashboard", () => showDashboard()],
    ["agentRemote.generatePairingCode", () => generatePairingCode()],
    ["agentRemote.configureTelegramToken", () => configureToken(context)],
    ["agentRemote.clearTelegramToken", () => clearToken(context)],
    ["agentRemote.showSecurityStatus", () => showSecurity()],
    ["agentRemote.showMcpStatus", () => showMcp()],
    ["agentRemote.installCursorHooks", () => installHooks()],
    ["agentRemote.uninstallCursorHooks", () => uninstallHooks()],
  ];

  for (const [id, handler] of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }

  updateStatusBar();
  const refreshInterval = setInterval(() => {
    treeProvider.refresh();
    updateStatusBar();
  }, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
}

async function getWorkspace(): Promise<vscode.WorkspaceFolder> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) throw new Error("Open a workspace folder first");
  return folder;
}

async function startBridge(): Promise<void> {
  const folder = await getWorkspace();
  try {
    await bridgeManager.start(folder);
    vscode.window.showInformationMessage(`Bridge running at ${bridgeManager.state.url}`);
    treeProvider.refresh();
    updateStatusBar();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await vscode.window.showErrorMessage(message, { modal: true });
  }
}

async function stopBridge(): Promise<void> {
  await bridgeManager.stop();
  vscode.window.showInformationMessage("Bridge stopped");
  treeProvider.refresh();
  updateStatusBar();
}

async function restartBridge(): Promise<void> {
  const folder = await getWorkspace();
  try {
    await bridgeManager.restart(folder);
    vscode.window.showInformationMessage("Bridge restarted");
    updateStatusBar();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await vscode.window.showErrorMessage(message, { modal: true });
  }
}

async function generatePairingCode(): Promise<void> {
  if (!bridgeManager.state.running) await startBridge();
  const { code, expiresAt } = await bridgeApi.createPairingCode();
  await vscode.env.clipboard.writeText(code);
  vscode.window.showInformationMessage(
    `Pairing code: ${code} (expires ${expiresAt}). Copied to clipboard. Send /pair ${code} in Telegram.`,
  );
}

async function configureToken(context: vscode.ExtensionContext): Promise<void> {
  const token = await vscode.window.showInputBox({
    prompt: "Telegram bot token from BotFather",
    password: true,
    ignoreFocusOut: true,
  });
  const trimmed = token?.trim();
  if (!trimmed) return;
  await context.secrets.store(SECRET_TELEGRAM, trimmed);
  if (bridgeManager.state.running) {
    const folder = await getWorkspace();
    await bridgeManager.restart(folder);
    vscode.window.showInformationMessage(
      "Telegram token stored. Bridge restarted with Telegram enabled.",
    );
  } else {
    vscode.window.showInformationMessage(
      "Telegram token stored in SecretStorage. Start the bridge to enable Telegram.",
    );
  }
  treeProvider.refresh();
  updateStatusBar();
}

async function clearToken(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_TELEGRAM);
  vscode.window.showInformationMessage("Telegram token cleared");
}

async function showDashboard(): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "agentRemoteDashboard",
    "Agent Remote",
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  const render = async () => {
    let html = "<h1>Agent Remote Control</h1>";
    try {
      const tokenInSecrets = Boolean(await extensionContext.secrets.get(SECRET_TELEGRAM));
      html += `<p>Token in SecretStorage: ${tokenInSecrets ? "yes" : "no"}</p>`;
      if (!bridgeManager.state.running) {
        html += "<p>Bridge is stopped. Run Start Bridge.</p>";
      } else {
        const s = await bridgeApi.getConfigStatus();
        html += `<pre>${JSON.stringify(s, null, 2)}</pre>`;
        if (tokenInSecrets && !s.telegramConfigured) {
          html +=
            "<p><b>Token stored but bridge has no Telegram token.</b> Run Restart Bridge.</p>";
        }
      }
    } catch (e) {
      html += `<p>Error: ${e instanceof Error ? e.message : String(e)}</p>`;
    }
    panel.webview.html = `<!DOCTYPE html><html><body>${html}</body></html>`;
  };

  await render();
  const interval = setInterval(render, 3000);
  panel.onDidDispose(() => clearInterval(interval));
}

async function showSecurity(): Promise<void> {
  const paired = bridgeManager.state.running
    ? ((await bridgeApi.getConfigStatus()) as { telegramPaired?: boolean }).telegramPaired
    : false;
  vscode.window.showInformationMessage(
    `Security: Telegram token in SecretStorage only. Bridge auth token ephemeral. Paired: ${paired}`,
  );
}

async function showMcp(): Promise<void> {
  if (!bridgeManager.state.running) {
    vscode.window.showWarningMessage("Start bridge first");
    return;
  }
  const mcp = await bridgeApi.getMcpStatus();
  vscode.window.showInformationMessage(`MCP: ${JSON.stringify(mcp)}`);
}

async function installHooks(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    "Install Agent Remote Cursor hooks in this workspace?",
    { modal: true },
    "Install",
  );
  if (confirm !== "Install") return;

  const config = {
    version: 1,
    hooks: {
      beforeShellExecution: [
        { command: "npx", args: ["@agent-remote/hooks", "agent-remote-before-shell"] },
      ],
      afterShellExecution: [
        { command: "npx", args: ["@agent-remote/hooks", "agent-remote-after-shell"] },
      ],
    },
  };

  if (bridgeManager.state.running) await bridgeApi.installHooks();
  vscode.window.showInformationMessage(
    `Hooks config template:\n${JSON.stringify(config, null, 2)}\nMerge into .cursor/hooks.json (in ${vscode.workspace.workspaceFolders![0]!.uri.fsPath}) manually if needed.`,
  );
}

async function uninstallHooks(): Promise<void> {
  if (bridgeManager.state.running) await bridgeApi.uninstallHooks();
  vscode.window.showInformationMessage("Hooks marked uninstalled");
}

function updateStatusBar(): void {
  const s = bridgeManager.state;
  if (!s.running) {
    statusBar.text = "$(debug-disconnect) Agent Remote: stopped";
  } else {
    statusBar.text = "$(debug-start) Agent Remote: running";
  }
  statusBar.show();
}

export function deactivate(): void {
  void bridgeManager?.stop();
}
