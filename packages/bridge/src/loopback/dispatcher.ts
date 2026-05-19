import type { LoopbackEvent, LoopbackKind, LoopbackSource } from "@agent-remote/shared";
import { generateId } from "../lib/ids.js";
import type { AuditLog } from "../audit-log.js";
import type { AgentAdapterRegistry } from "../adapters/registry.js";

export interface EnqueueLoopbackInput {
  sessionId: string;
  source: LoopbackSource;
  kind: LoopbackKind;
  payload: unknown;
  correlationId?: string;
  expiresInMs?: number;
}

type McpWaiter = {
  correlationId: string;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class LoopbackDispatcher {
  private queues = new Map<string, LoopbackEvent[]>();
  private mcpWaiters = new Map<string, McpWaiter>();

  constructor(
    private readonly audit: AuditLog,
    private readonly adapters: AgentAdapterRegistry,
  ) {}

  enqueue(input: EnqueueLoopbackInput): LoopbackEvent {
    const event: LoopbackEvent = {
      id: generateId("lb"),
      sessionId: input.sessionId,
      source: input.source,
      kind: input.kind,
      payload: input.payload,
      correlationId: input.correlationId,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresInMs
        ? new Date(Date.now() + input.expiresInMs).toISOString()
        : undefined,
      status: "queued",
    };
    const queue = this.queues.get(input.sessionId) ?? [];
    queue.push(event);
    this.queues.set(input.sessionId, queue);
    this.audit.append("loopback.enqueue", `${input.kind} for ${input.sessionId}`);
    void this.deliver(event);
    return event;
  }

  async deliver(event: LoopbackEvent): Promise<void> {
    if (event.expiresAt && new Date(event.expiresAt) < new Date()) {
      event.status = "expired";
      return;
    }

    if (event.correlationId) {
      const waiter = this.mcpWaiters.get(event.correlationId);
      if (waiter) {
        clearTimeout(waiter.timeout);
        this.mcpWaiters.delete(event.correlationId);
        waiter.resolve(event.payload);
        event.status = "delivered";
        return;
      }
    }

    const adapter = this.adapters.getActive();
    if (adapter?.deliverLoopbackEvent) {
      try {
        await adapter.deliverLoopbackEvent(event);
        event.status = "delivered";
      } catch {
        event.status = "failed";
      }
    } else if (event.kind === "user_message" && typeof event.payload === "object") {
      const msg = (event.payload as { message?: string }).message;
      if (msg) {
        await this.adapters.sendMessage(event.sessionId, msg);
        event.status = "delivered";
      }
    } else if (event.kind === "cancel") {
      await this.adapters.stopSession(event.sessionId);
      event.status = "delivered";
    }
  }

  list(sessionId: string): LoopbackEvent[] {
    return this.queues.get(sessionId) ?? [];
  }

  listPending(): LoopbackEvent[] {
    const all: LoopbackEvent[] = [];
    for (const queue of this.queues.values()) {
      all.push(...queue.filter((e) => e.status === "queued"));
    }
    return all;
  }

  registerMcpWaiter(
    correlationId: string,
    timeoutMs: number,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.mcpWaiters.delete(correlationId);
        reject(new Error("MCP waiter expired"));
      }, timeoutMs);
      this.mcpWaiters.set(correlationId, {
        correlationId,
        resolve,
        reject,
        timeout,
      });
    });
  }

  resolveMcpWaiter(correlationId: string, payload: unknown): void {
    const waiter = this.mcpWaiters.get(correlationId);
    if (waiter) {
      clearTimeout(waiter.timeout);
      this.mcpWaiters.delete(correlationId);
      waiter.resolve(payload);
    }
  }

  getMcpWaiterCount(): number {
    return this.mcpWaiters.size;
  }
}
