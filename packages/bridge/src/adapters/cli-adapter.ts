import { spawn, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import * as path from "node:path";
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
  resolvedCommand: string;
}

const IS_WINDOWS = process.platform === "win32";

async function findOnPath(cmd: string): Promise<string | undefined> {
  if (path.isAbsolute(cmd)) {
    try {
      await access(cmd, constants.X_OK);
      return cmd;
    } catch {
      return undefined;
    }
  }

  const pathEnv = process.env.PATH ?? "";
  const pathSep = IS_WINDOWS ? ";" : ":";
  const exts = IS_WINDOWS
    ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").map((e) => e.toLowerCase())
    : [""];

  for (const dir of pathEnv.split(pathSep).filter(Boolean)) {
    for (const ext of exts) {
      const candidate = path.join(dir, cmd + ext);
      try {
        await access(candidate, IS_WINDOWS ? constants.F_OK : constants.X_OK);
        return candidate;
      } catch {
        /* try next */
      }
    }
  }
  return undefined;
}

export class CursorCliAgentAdapter implements AgentAdapter {
  id = "cursor-cli";
  displayName = "Cursor CLI";

  private sessions = new Map<string, CliSession>();
  private resolvedCommand?: string;

  async isAvailable(): Promise<boolean> {
    for (const candidate of ["cursor", "cursor-agent", "agent"]) {
      const resolved = await findOnPath(candidate);
      if (resolved) {
        this.resolvedCommand = resolved;
        return true;
      }
    }
    return false;
  }

  async startSession(input: StartSessionInput): Promise<SessionHandle> {
    if (!this.resolvedCommand && !(await this.isAvailable())) {
      throw new Error("Cursor CLI not found on PATH");
    }
    const command = this.resolvedCommand!;

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

    // Do not use shell: true on Windows — it joins argv into one string and breaks
    // paths with spaces (e.g. C:\Program Files\...). Node spawns .cmd/.bat via cmd.exe
    // automatically when shell is false.
    const proc = spawn(command, ["agent", "--print", input.prompt], {
      cwd: input.workspaceUri,
      env: process.env,
      windowsHide: IS_WINDOWS,
    });

    proc.stdout?.on("data", (d: Buffer) => appendLog("info", d.toString()));
    proc.stderr?.on("data", (d: Buffer) => appendLog("warn", d.toString()));
    proc.on("error", (err) => appendLog("error", err.message));
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
      resolvedCommand: command,
    });

    return { sessionId };
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!session.process.stdin || session.process.stdin.destroyed) {
      session.logs.push({
        id: generateId("log"),
        sessionId,
        timestamp: new Date().toISOString(),
        level: "warn",
        message: `[follow-up dropped: stdin closed] ${message}`,
        redacted: false,
      });
      return;
    }
    await new Promise<void>((resolve, reject) => {
      session.process.stdin!.write(`${message}\n`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    session.logs.push({
      id: generateId("log"),
      sessionId,
      timestamp: new Date().toISOString(),
      level: "info",
      message: `[follow-up sent] ${message}`,
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
}
