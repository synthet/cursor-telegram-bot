import { redact } from "@agent-remote/shared";
import { generateId } from "./lib/ids.js";

export interface AuditEntry {
  id: string;
  type: string;
  timestamp: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export class AuditLog {
  private entries: AuditEntry[] = [];
  private readonly maxEntries = 1000;

  append(type: string, summary: string, metadata?: Record<string, unknown>): AuditEntry {
    const entry: AuditEntry = {
      id: generateId("audit"),
      type,
      timestamp: new Date().toISOString(),
      summary: redact(summary),
      metadata: metadata
        ? Object.fromEntries(
            Object.entries(metadata).map(([k, v]) => [k, typeof v === "string" ? redact(v) : v]),
          )
        : undefined,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  getRecent(limit = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }
}
