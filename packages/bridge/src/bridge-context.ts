import { randomBytes } from "node:crypto";
import { AuditLog } from "./audit-log.js";
import { ApprovalQueue } from "./approval-queue.js";
import { AgentAdapterRegistry } from "./adapters/registry.js";
import { EventBus } from "./event-bus.js";
import { HookPolicyEngine } from "./hooks/policy.js";
import { LoopbackDispatcher } from "./loopback/dispatcher.js";
import { PairingService } from "./pairing.js";
import { RateLimiter } from "./lib/rate-limit.js";
import { SessionRegistry } from "./session-registry.js";

export interface BridgeConfig {
  host: string;
  port: number;
  workspaceUri: string;
  workspaceName: string;
  telegramToken?: string;
}

export class BridgeContext {
  readonly startedAt = Date.now();
  readonly authToken: string;
  readonly audit = new AuditLog();
  readonly events = new EventBus();
  readonly sessions = new SessionRegistry();
  readonly approvals = new ApprovalQueue();
  readonly pairing = new PairingService();
  readonly rateLimiter = new RateLimiter();
  readonly adapters = new AgentAdapterRegistry();
  readonly hookPolicy = new HookPolicyEngine();
  readonly loopback: LoopbackDispatcher;

  hooksInstalled = false;
  mcpRunning = false;
  telegramToken?: string;
  lastError?: string;

  private hookEvents: Array<{ id: string; summary: string; timestamp: string }> = [];
  private askUserWaiters = new Map<
    string,
    { chatId: number; correlationId: string; resolve: (v: string) => void }
  >();

  constructor(readonly config: BridgeConfig) {
    this.authToken = randomBytes(32).toString("hex");
    this.telegramToken = config.telegramToken;
    this.loopback = new LoopbackDispatcher(this.audit, this.adapters);
  }

  async initialize(): Promise<void> {
    await this.adapters.initialize();
    this.audit.append("bridge.start", "Bridge started");
  }

  recordHookEvent(id: string, summary: string): void {
    this.hookEvents.push({ id, summary, timestamp: new Date().toISOString() });
    if (this.hookEvents.length > 100) this.hookEvents.shift();
  }

  getRecentHookEvents() {
    return this.hookEvents.slice(-10);
  }

  registerAskUserWaiter(
    correlationId: string,
    chatId: number,
    resolve: (answer: string) => void,
  ): void {
    this.askUserWaiters.set(correlationId, { chatId, correlationId, resolve });
  }

  resolveAskUser(correlationId: string, answer: string): boolean {
    const waiter = this.askUserWaiters.get(correlationId);
    if (!waiter) return false;
    waiter.resolve(answer);
    this.askUserWaiters.delete(correlationId);
    this.loopback.resolveMcpWaiter(correlationId, { answer });
    return true;
  }

  getAskUserWaiterCount(): number {
    return this.askUserWaiters.size;
  }
}
