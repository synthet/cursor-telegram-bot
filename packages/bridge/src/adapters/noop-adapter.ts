import type { AgentAdapter } from "@agent-remote/shared";
import type { DiffSummary, LogEvent } from "@agent-remote/shared";
import type { LoopbackEvent } from "@agent-remote/shared";
import type { SessionHandle, SessionStatus, StartSessionInput } from "@agent-remote/shared";

export class NoopAgentAdapter implements AgentAdapter {
  id = "noop";
  displayName = "Noop (setup required)";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async startSession(_input: StartSessionInput): Promise<SessionHandle> {
    throw new Error(
      "No agent adapter available. Install Cursor CLI or set CURSOR_API_KEY for SDK adapter.",
    );
  }

  async sendMessage(): Promise<void> {
    throw new Error("No agent adapter available");
  }

  async stopSession(): Promise<void> {}

  async getSessionStatus(): Promise<SessionStatus> {
    return "failed";
  }

  async getRecentLogs(): Promise<LogEvent[]> {
    return [
      {
        id: "noop_1",
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Install Cursor CLI (cursor agent) or configure CURSOR_API_KEY. See docs/setup.md",
        redacted: false,
      },
    ];
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

  async deliverLoopbackEvent(_event: LoopbackEvent): Promise<void> {}
}
