import type { AgentAdapter } from "@agent-remote/shared";
import type { StartSessionInput } from "@agent-remote/shared";
import { CursorCliAgentAdapter } from "./cli-adapter.js";
import { NoopAgentAdapter } from "./noop-adapter.js";
import { SdkAgentAdapter } from "./sdk-adapter.js";

export class AgentAdapterRegistry {
  private adapters: AgentAdapter[] = [];
  private active: AgentAdapter | null = null;

  async initialize(): Promise<AgentAdapter> {
    this.adapters = [
      new CursorCliAgentAdapter(),
      new SdkAgentAdapter(),
      new NoopAgentAdapter(),
    ];
    for (const adapter of this.adapters) {
      if (adapter.id === "noop") continue;
      if (await adapter.isAvailable()) {
        this.active = adapter;
        return adapter;
      }
    }
    this.active = new NoopAgentAdapter();
    return this.active;
  }

  getActive(): AgentAdapter | null {
    return this.active;
  }

  getActiveId(): string {
    return this.active?.id ?? "none";
  }

  async startSession(input: StartSessionInput) {
    if (!this.active) await this.initialize();
    return this.active!.startSession(input);
  }

  async sendMessage(sessionId: string, message: string) {
    if (!this.active) throw new Error("No adapter");
    return this.active.sendMessage(sessionId, message);
  }

  async stopSession(sessionId: string) {
    if (!this.active) return;
    return this.active.stopSession(sessionId);
  }

  async getRecentLogs(sessionId: string, limit: number) {
    if (!this.active) return [];
    return this.active.getRecentLogs(sessionId, limit);
  }

  async getDiffSummary(sessionId: string) {
    if (!this.active) {
      return {
        sessionId,
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        files: [],
      };
    }
    return this.active.getDiffSummary(sessionId);
  }
}
