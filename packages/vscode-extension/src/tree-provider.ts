import * as vscode from "vscode";
import type { ExtensionBridgeApi } from "./bridge-api.js";

export class AgentRemoteTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly api: ExtensionBridgeApi) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) return [];

    const items: vscode.TreeItem[] = [];
    try {
      const status = await this.api.getConfigStatus();
      items.push(
        new vscode.TreeItem(
          `Bridge: ${status.bridgeRunning ? "running" : "stopped"}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
      items.push(
        new vscode.TreeItem(
          `Telegram: ${status.telegramPaired ? "paired" : "unpaired"}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
      items.push(
        new vscode.TreeItem(
          `Sessions: ${status.sessionCount ?? 0}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
      items.push(
        new vscode.TreeItem(
          `Approvals: ${status.pendingApprovals ?? 0}`,
          vscode.TreeItemCollapsibleState.None,
        ),
      );
    } catch {
      items.push(
        new vscode.TreeItem("Bridge not running", vscode.TreeItemCollapsibleState.None),
      );
    }
    return items;
  }
}
