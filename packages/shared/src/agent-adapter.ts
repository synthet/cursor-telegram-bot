import type { DiffSummary, LogEvent } from "./schemas/log.js";
import type { LoopbackEvent } from "./schemas/loopback.js";
import type { SessionHandle, SessionStatus, StartSessionInput } from "./schemas/session.js";

export interface AgentAdapter {
  id: string;
  displayName: string;
  isAvailable(): Promise<boolean>;
  startSession(input: StartSessionInput): Promise<SessionHandle>;
  sendMessage(sessionId: string, message: string): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  getSessionStatus(sessionId: string): Promise<SessionStatus>;
  getRecentLogs(sessionId: string, limit: number): Promise<LogEvent[]>;
  getDiffSummary(sessionId: string): Promise<DiffSummary>;
  deliverLoopbackEvent?(event: LoopbackEvent): Promise<void>;
}
