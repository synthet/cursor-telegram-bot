import type { AuditEntry } from "./audit-log.js";

export type BridgeEvent =
  | { type: "audit"; entry: AuditEntry }
  | { type: "session"; sessionId: string; action: string }
  | { type: "approval"; approvalId: string; action: string }
  | { type: "hook"; hookId: string }
  | { type: "loopback"; eventId: string };

type Listener = (event: BridgeEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: BridgeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
