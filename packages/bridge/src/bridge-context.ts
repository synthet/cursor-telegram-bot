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

export type TelegramSender = (
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
) => Promise<unknown>;

interface AskWaiter {
  correlationId: string;
  chatId: number;
  question: string;
  choices?: string[];
  resolve: (result: {
    answer?: string;
    choice?: string;
    status: "answered" | "expired" | "cancelled";
  }) => void;
  timer: ReturnType<typeof setTimeout>;
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
  telegramSender?: TelegramSender;

  private hookEvents: Array<{ id: string; summary: string; timestamp: string }> = [];
  private askWaiters = new Map<string, AskWaiter>();
  private askQueueByChat = new Map<number, string[]>();

  constructor(readonly config: BridgeConfig) {
    this.authToken = randomBytes(32).toString("hex");
    this.telegramToken = config.telegramToken;
    this.loopback = new LoopbackDispatcher(this.audit, this.adapters, this.events);
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

  registerAskWaiter(input: {
    correlationId: string;
    chatId: number;
    question: string;
    choices?: string[];
    timeoutMs: number;
  }): Promise<{ answer?: string; choice?: string; status: "answered" | "expired" | "cancelled" }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.askWaiters.has(input.correlationId)) {
          this.askWaiters.delete(input.correlationId);
          this.removeAskFromQueue(input.chatId, input.correlationId);
          resolve({ status: "expired" });
        }
      }, input.timeoutMs);

      this.askWaiters.set(input.correlationId, {
        correlationId: input.correlationId,
        chatId: input.chatId,
        question: input.question,
        choices: input.choices,
        resolve: (result) => {
          clearTimeout(timer);
          this.askWaiters.delete(input.correlationId);
          this.removeAskFromQueue(input.chatId, input.correlationId);
          resolve(result);
        },
        timer,
      });

      const queue = this.askQueueByChat.get(input.chatId) ?? [];
      queue.push(input.correlationId);
      this.askQueueByChat.set(input.chatId, queue);
    });
  }

  /** Resolve the oldest pending ask for `chatId` with a free-text answer. */
  resolveOldestAsk(chatId: number, answer: string): boolean {
    const queue = this.askQueueByChat.get(chatId);
    if (!queue || queue.length === 0) return false;
    const correlationId = queue[0]!;
    return this.resolveAsk(correlationId, { answer, status: "answered" });
  }

  resolveAsk(
    correlationId: string,
    result: { answer?: string; choice?: string; status: "answered" | "expired" | "cancelled" },
  ): boolean {
    const waiter = this.askWaiters.get(correlationId);
    if (!waiter) return false;
    waiter.resolve(result);
    return true;
  }

  private removeAskFromQueue(chatId: number, correlationId: string): void {
    const queue = this.askQueueByChat.get(chatId);
    if (!queue) return;
    const idx = queue.indexOf(correlationId);
    if (idx >= 0) queue.splice(idx, 1);
    if (queue.length === 0) this.askQueueByChat.delete(chatId);
  }

  getAskUserWaiterCount(): number {
    return this.askWaiters.size;
  }
}
