import { spawn, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import type { AgentAdapter } from "@agent-remote/shared";
import type { DiffSummary, LogEvent } from "@agent-remote/shared";
import type { LoopbackEvent } from "@agent-remote/shared";
import type { SessionHandle, SessionStatus, StartSessionInput } from "@agent-remote/shared";
import { generateId } from "../lib/ids.js";

interface CliSession {
  process: ChildProcess;
  logs: LogEvent[];
  cwd: string;
  status: SessionStatus;
}

export class CursorCliAgentAdapter implements AgentAdapter {
  id = "cursor-cli";
  displayName = "Cursor CLI";

  private sessions = new Map<string, CliSession>();
  private cliCommand = "cursor";

  async isAvailable(): Promise<boolean> {
    try {
      await this.which(this.cliCommand);
      return true;
    } catch {
      try {
        this.cliCommand = "agent";
        await this.which(this.cliCommand);
        return true;
      } catch {
        return false;
      }
    }
  }

  async startSession(input: StartSessionInput): Promise<SessionHandle> {
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

    const proc = spawn(
      this.cliCommand,
      ["agent", "--print", input.prompt],
      { cwd: input.workspaceUri, shell: false, env: process.env },
    );

    proc.stdout?.on("data", (d: Buffer) => appendLog("info", d.toString()));
    proc.stderr?.on("data", (d: Buffer) => appendLog("warn", d.toString()));
    proc.on("close", (code) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = code === 0 ? "completed" : "failed";
      }
    });

    this.sessions.set(sessionId, {
      process: proc,
      logs,
      cwd: input.workspaceUri,
      status: "running",
    });

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
      message: `[follow-up queued] ${message}`,
      redacted: false,
    });
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.process.kill("SIGTERM");
      session.status = "stopped";
    }
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    return this.sessions.get(sessionId)?.status ?? "failed";
  }

  async getRecentLogs(sessionId: string, limit: number): Promise<LogEvent[]> {
    const logs = this.sessions.get(sessionId)?.logs ?? [];
    return logs.slice(-limit);
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
    } else if (event.kind === "cancel") {
      await this.stopSession(event.sessionId);
    }
  }

  private which(cmd: string): Promise<void> {
    return access(cmd, constants.X_OK).catch(() => {
      throw new Error(`Command not found: ${cmd}`);
    });
  }
}
