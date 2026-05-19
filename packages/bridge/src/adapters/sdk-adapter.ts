import type { AgentAdapter } from "@agent-remote/shared";
import type { DiffSummary, LogEvent } from "@agent-remote/shared";
import type { LoopbackEvent } from "@agent-remote/shared";
import type { SessionHandle, SessionStatus, StartSessionInput } from "@agent-remote/shared";
import { generateId } from "../lib/ids.js";

interface SdkSession {
  agentId?: string;
  logs: LogEvent[];
  status: SessionStatus;
  cwd: string;
}

export class SdkAgentAdapter implements AgentAdapter {
  id = "cursor-sdk";
  displayName = "Cursor SDK";

  private sessions = new Map<string, SdkSession>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private AgentClass: any = null;

  async isAvailable(): Promise<boolean> {
    if (!process.env.CURSOR_API_KEY) return false;
    try {
      const mod = await import(/* webpackIgnore: true */ "@cursor/sdk");
      this.AgentClass = mod.Agent;
      return true;
    } catch {
      return false;
    }
  }

  async startSession(input: StartSessionInput): Promise<SessionHandle> {
    if (!this.AgentClass) {
      const ok = await this.isAvailable();
      if (!ok) throw new Error("Cursor SDK not available");
    }

    const sessionId = generateId("sess");
    const logs: LogEvent[] = [];
    const appendLog = (level: LogEvent["level"], message: string) => {
      logs.push({
        id: generateId("log"),
        sessionId,
        timestamp: new Date().toISOString(),
        level,
        message,
        redacted: false,
      });
    };

    const agent = this.AgentClass.create({
      apiKey: process.env.CURSOR_API_KEY!,
      model: { id: "composer-2" },
      local: { cwd: input.workspaceUri },
    });

    this.sessions.set(sessionId, {
      logs,
      status: "running",
      cwd: input.workspaceUri,
    });

    void (async () => {
      try {
        const run = await agent.send(input.prompt);
        for await (const event of run.stream()) {
          if (event.type === "assistant") {
            for (const block of event.message?.content ?? []) {
              if (block.type === "text") appendLog("info", block.text);
            }
          }
        }
        await run.wait();
        const s = this.sessions.get(sessionId);
        if (s) s.status = "completed";
      } catch (err) {
        appendLog("error", err instanceof Error ? err.message : String(err));
        const s = this.sessions.get(sessionId);
        if (s) s.status = "failed";
      } finally {
        try {
          await agent[Symbol.asyncDispose]?.();
        } catch {
          /* ignore */
        }
      }
    })();

    return { sessionId };
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.logs.push({
      id: generateId("log"),
      sessionId,
      timestamp: new Date().toISOString(),
      level: "info",
      message: `[sdk follow-up] ${message}`,
      redacted: false,
    });
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.status = "stopped";
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    return this.sessions.get(sessionId)?.status ?? "failed";
  }

  async getRecentLogs(sessionId: string, limit: number): Promise<LogEvent[]> {
    return (this.sessions.get(sessionId)?.logs ?? []).slice(-limit);
  }

  async getDiffSummary(sessionId: string): Promise<DiffSummary> {
    return {
      sessionId,
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    };
  }

  async deliverLoopbackEvent(event: LoopbackEvent): Promise<void> {
    if (event.kind === "user_message") {
      const msg =
        typeof event.payload === "object" && event.payload !== null
          ? (event.payload as { message?: string }).message
          : String(event.payload);
      if (msg) await this.sendMessage(event.sessionId, msg);
    }
  }
}
