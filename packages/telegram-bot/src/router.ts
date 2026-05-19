import {
  buildCallbackData,
  chunkMessage,
  escapeTelegramHtml,
  formatCodeBlock,
  parseCallbackData,
  parseTelegramCommand,
  redact,
} from "@agent-remote/shared";
import type { TelegramClient } from "./client.js";
import type { BridgeClient } from "./bridge-client.js";

export interface UpdateRouterDeps {
  client: TelegramClient;
  bridge: BridgeClient;
  isAuthorized: (chatId: number) => boolean;
  getWorkspace: () => { uri: string; name: string };
  onApprovalNeeded?: (chatId: number, approval: {
    id: string;
    nonce: string;
    summary: string;
    sessionId: string;
    risk: string;
    details: string;
  }) => Promise<void>;
}

export class UpdateRouter {
  constructor(private readonly deps: UpdateRouterDeps) {}

  async handleUpdate(update: Record<string, unknown>): Promise<void> {
    if ("callback_query" in update && update.callback_query) {
      await this.handleCallback(update.callback_query as Record<string, unknown>);
      return;
    }
    if ("message" in update && update.message) {
      await this.handleMessage(update.message as Record<string, unknown>);
    }
  }

  private async handleMessage(message: Record<string, unknown>): Promise<void> {
    const chat = message.chat as { id: number; type: string };
    const text = (message.text as string) ?? "";
    const chatId = chat.id;

    const cmd = parseTelegramCommand(text);
    if (!cmd) return;

    if (cmd.name === "start" || cmd.name === "help") {
      await this.sendStartOrHelp(chatId, cmd.name);
      return;
    }

    if (!this.deps.isAuthorized(chatId)) {
      if (cmd.name === "pair") {
        await this.handlePair(chatId, chat.type, cmd.args[0] ?? "");
        return;
      }
      await this.deps.client.sendMessage(
        chatId,
        "Unauthorized. Pair first with /pair &lt;code&gt; from the extension.",
      );
      return;
    }

    switch (cmd.name) {
      case "status":
        await this.handleStatus(chatId);
        break;
      case "pair":
        await this.deps.client.sendMessage(chatId, "Already paired.");
        break;
      case "sessions":
        await this.handleSessions(chatId);
        break;
      case "new":
        await this.handleNew(chatId, cmd.args.join(" "));
        break;
      case "ask":
        await this.handleAsk(chatId, cmd.args[0], cmd.args[1]);
        break;
      case "stop":
        await this.handleStop(chatId, cmd.args[0]);
        break;
      case "logs":
        await this.handleLogs(chatId, cmd.args[0]);
        break;
      case "diff":
        await this.handleDiff(chatId, cmd.args[0]);
        break;
      case "approve":
        await this.handleApproveDeny(chatId, cmd.args[0], "approve");
        break;
      case "deny":
        await this.handleApproveDeny(chatId, cmd.args[0], "deny");
        break;
      case "mcp":
        await this.handleMcp(chatId);
        break;
      case "hooks":
        await this.handleHooks(chatId);
        break;
      case "loopback":
        await this.handleLoopback(chatId);
        break;
      case "workspace":
        await this.handleWorkspace(chatId);
        break;
      case "settings":
        await this.deps.client.sendMessage(chatId, "Settings: private chat only, single authorized chat.");
        break;
      default:
        await this.deps.client.sendMessage(chatId, `Unknown command. Use /help`);
    }
  }

  private async sendStartOrHelp(chatId: number, name: string): Promise<void> {
    if (name === "start") {
      await this.deps.client.sendMessage(
        chatId,
        `<b>Agent Remote Bot</b>\n\nThis bot controls local Cursor/VS Code agentic sessions after pairing.\n\nTo pair:\n1. Open Cursor/VS Code.\n2. Run "Agent Remote: Generate Pairing Code".\n3. Send /pair &lt;code&gt; here.\n\nUse /help to see commands.`,
      );
    } else {
      await this.deps.client.sendMessage(
        chatId,
        `<b>Commands</b>\n/start /help /pair /status /sessions /new /ask /approve /deny /logs /diff /stop /workspace /mcp /hooks /loopback /settings`,
      );
    }
  }

  private async handlePair(chatId: number, chatType: string, code: string): Promise<void> {
    if (!code) {
      await this.deps.client.sendMessage(chatId, "Usage: /pair &lt;code&gt;");
      return;
    }
    const result = await this.deps.bridge.confirmPairing(code, chatId, chatType);
    await this.deps.client.sendMessage(
      chatId,
      result.ok ? "Paired successfully. Use /status to verify." : "Invalid or expired pairing code.",
    );
  }

  private async handleStatus(chatId: number): Promise<void> {
    const s = await this.deps.bridge.getConfigStatus();
    const ws = this.deps.getWorkspace();
    await this.deps.client.sendMessage(
      chatId,
      [
        "<b>Status</b>",
        `Bridge: ${s.bridgeRunning ? "running" : "stopped"}`,
        `Telegram: ${s.telegramPaired ? "paired" : "unpaired"}`,
        `Workspace: ${escapeTelegramHtml(ws.name)}`,
        `Sessions: ${s.sessionCount}`,
        `Pending approvals: ${s.pendingApprovals}`,
        `MCP: ${s.mcpRunning ? "running" : "stopped"}`,
        `Hooks: ${s.hooksInstalled ? "installed" : "not installed"}`,
        `Loopback pending: ${s.pendingLoopback}`,
        `Adapter: ${escapeTelegramHtml(s.activeAdapter ?? "none")}`,
        s.lastError ? `Last error: ${escapeTelegramHtml(redact(s.lastError))}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  private async handleSessions(chatId: number): Promise<void> {
    const { sessions } = await this.deps.bridge.listSessions();
    if (sessions.length === 0) {
      await this.deps.client.sendMessage(chatId, "No active sessions.");
      return;
    }
    const lines = sessions.map(
      (s) => `${escapeTelegramHtml(s.id)} — ${s.status}${s.title ? ` (${escapeTelegramHtml(s.title)})` : ""}`,
    );
    await this.deps.client.sendMessage(chatId, `<b>Sessions</b>\n${lines.join("\n")}`);
  }

  private async handleNew(chatId: number, prompt: string): Promise<void> {
    if (!prompt) {
      await this.deps.client.sendMessage(
        chatId,
        "Usage: /new Fix the failing tests and summarize the changes",
      );
      return;
    }
    const ws = this.deps.getWorkspace();
    try {
      const { session } = await this.deps.bridge.createSession({
        prompt,
        workspaceUri: ws.uri,
        workspaceName: ws.name,
      });
      await this.deps.client.sendMessage(
        chatId,
        [
          `Started session <code>${escapeTelegramHtml(session.id)}</code>`,
          `Workspace: ${escapeTelegramHtml(ws.name)}`,
          `Adapter: ${escapeTelegramHtml(session.adapter)}`,
          `Status: ${session.status}`,
        ].join("\n"),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Logs",
                  callback_data: buildCallbackData("session", "logs", session.id, "n0"),
                },
                {
                  text: "Diff",
                  callback_data: buildCallbackData("session", "diff", session.id, "n0"),
                },
              ],
              [
                {
                  text: "Stop",
                  callback_data: buildCallbackData("session", "stop", session.id, "n0"),
                },
              ],
            ],
          },
        },
      );
    } catch (err) {
      await this.deps.client.sendMessage(
        chatId,
        `Could not start session: ${escapeTelegramHtml(redact(err instanceof Error ? err.message : String(err)))}`,
      );
    }
  }

  private async handleAsk(chatId: number, sessionId?: string, message?: string): Promise<void> {
    if (!sessionId || !message) {
      await this.deps.client.sendMessage(chatId, "Usage: /ask &lt;session_id&gt; &lt;message&gt;");
      return;
    }
    await this.deps.bridge.sendMessage(sessionId, message);
    await this.deps.client.sendMessage(chatId, `Message queued for ${escapeTelegramHtml(sessionId)}`);
  }

  private async handleStop(chatId: number, sessionId?: string): Promise<void> {
    if (!sessionId) {
      await this.deps.client.sendMessage(chatId, "Usage: /stop &lt;session_id&gt;");
      return;
    }
    await this.deps.bridge.stopSession(sessionId);
    await this.deps.client.sendMessage(chatId, `Stopped ${escapeTelegramHtml(sessionId)}`);
  }

  private async handleLogs(chatId: number, sessionId?: string): Promise<void> {
    if (!sessionId) {
      await this.deps.client.sendMessage(chatId, "Usage: /logs &lt;session_id&gt;");
      return;
    }
    const { logs } = await this.deps.bridge.getLogs(sessionId);
    const text = redact(logs.map((l) => `[${l.level}] ${l.message}`).join("\n") || "No logs");
    for (const chunk of chunkMessage(text.slice(0, 3500))) {
      await this.deps.client.sendMessage(chatId, formatCodeBlock(chunk));
    }
  }

  private async handleDiff(chatId: number, sessionId?: string): Promise<void> {
    if (!sessionId) {
      await this.deps.client.sendMessage(chatId, "Usage: /diff &lt;session_id&gt;");
      return;
    }
    const diff = await this.deps.bridge.getDiff(sessionId);
    const files = diff.files.map((f) => escapeTelegramHtml(f.path)).join("\n") || "No changes";
    await this.deps.client.sendMessage(
      chatId,
      `<b>Diff</b> (${diff.filesChanged} files)\n<pre>${files}</pre>`,
    );
  }

  private async handleApproveDeny(
    chatId: number,
    approvalId: string | undefined,
    action: "approve" | "deny",
  ): Promise<void> {
    if (!approvalId) {
      await this.deps.client.sendMessage(chatId, `Usage: /${action} &lt;approval_id&gt;`);
      return;
    }
    await this.deps.bridge.decideApproval(approvalId, action);
    await this.deps.client.sendMessage(chatId, `${action === "approve" ? "Approved" : "Denied"} ${escapeTelegramHtml(approvalId)}`);
  }

  private async handleMcp(chatId: number): Promise<void> {
    const m = await this.deps.bridge.getMcpStatus();
    await this.deps.client.sendMessage(
      chatId,
      `<b>MCP</b>\nRunning: ${m.running}\nTools: ${m.tools.join(", ")}\nWaiters: ${m.waiters}`,
    );
  }

  private async handleHooks(chatId: number): Promise<void> {
    const h = await this.deps.bridge.getHooksStatus();
    await this.deps.client.sendMessage(
      chatId,
      `<b>Hooks</b>\nInstalled: ${h.installed}\nRecent events: ${h.recentEvents}`,
    );
  }

  private async handleLoopback(chatId: number): Promise<void> {
    const s = await this.deps.bridge.getConfigStatus();
    await this.deps.client.sendMessage(
      chatId,
      `<b>Loopback</b>\nPending events: ${s.pendingLoopback}`,
    );
  }

  private async handleWorkspace(chatId: number): Promise<void> {
    const ws = this.deps.getWorkspace();
    await this.deps.client.sendMessage(
      chatId,
      `<b>Workspace</b>\n${escapeTelegramHtml(ws.name)}\n<code>${escapeTelegramHtml(ws.uri)}</code>`,
    );
  }

  private async handleCallback(cb: Record<string, unknown>): Promise<void> {
    const id = cb.id as string;
    const data = (cb.data as string) ?? "";
    const message = cb.message as { chat: { id: number }; message_id: number } | undefined;
    const chatId = (cb.from as { id: number }).id;

    try {
      await this.deps.client.answerCallbackQuery(id);
    } catch {
      /* always try */
    }

    if (!this.deps.isAuthorized(chatId)) return;

    const parsed = parseCallbackData(data);
    if (!parsed) return;

    if (parsed.kind === "approval") {
      await this.deps.bridge.decideApproval(
        parsed.id,
        parsed.action === "approve" ? "approve" : "deny",
        parsed.nonce,
      );
      if (message) {
        await this.deps.client.editMessageText(
          message.chat.id,
          message.message_id,
          `${parsed.action === "approve" ? "Approved" : "Denied"} (processed)`,
        );
      }
      return;
    }

    if (parsed.kind === "session") {
      if (parsed.action === "stop") {
        await this.deps.bridge.stopSession(parsed.id);
      } else if (parsed.action === "logs") {
        await this.handleLogs(chatId, parsed.id);
      } else if (parsed.action === "diff") {
        await this.handleDiff(chatId, parsed.id);
      }
    }
  }
}
