import type { ActionType, ApprovalRequest, ApprovalStatus, RiskLevel } from "@agent-remote/shared";
import { generateId, generateNonce } from "./lib/ids.js";

export interface CreateApprovalInput {
  sessionId: string;
  risk: RiskLevel;
  actionType: ActionType;
  summary: string;
  details: string;
  timeoutMs?: number;
}

type ApprovalWaiter = {
  resolve: (status: ApprovalStatus) => void;
  reject: (err: Error) => void;
};

export class ApprovalQueue {
  private approvals = new Map<string, ApprovalRequest>();
  private waiters = new Map<string, ApprovalWaiter>();

  create(input: CreateApprovalInput): ApprovalRequest {
    const timeoutMs = input.timeoutMs ?? 5 * 60_000;
    const approval: ApprovalRequest = {
      id: generateId("appr"),
      sessionId: input.sessionId,
      risk: input.risk,
      actionType: input.actionType,
      summary: input.summary,
      details: input.details,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
      status: "pending",
      nonce: generateNonce(),
    };
    this.approvals.set(approval.id, approval);
    return approval;
  }

  get(id: string): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  listPending(): ApprovalRequest[] {
    this.expireStale();
    return [...this.approvals.values()].filter((a) => a.status === "pending");
  }

  decide(id: string, status: "approved" | "denied", nonce?: string): ApprovalRequest | undefined {
    const approval = this.approvals.get(id);
    if (!approval || approval.status !== "pending") return approval;
    if (nonce && approval.nonce !== nonce) return undefined;
    if (new Date(approval.expiresAt) < new Date()) {
      approval.status = "expired";
      return approval;
    }
    approval.status = status;
    const waiter = this.waiters.get(id);
    if (waiter) {
      waiter.resolve(status);
      this.waiters.delete(id);
    }
    return approval;
  }

  waitForDecision(id: string, timeoutMs: number): Promise<ApprovalStatus> {
    const approval = this.approvals.get(id);
    if (!approval) return Promise.resolve("expired");
    if (approval.status !== "pending") return Promise.resolve(approval.status);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(id);
        approval.status = "expired";
        resolve("expired");
      }, timeoutMs);

      this.waiters.set(id, {
        resolve: (status) => {
          clearTimeout(timer);
          resolve(status);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }

  private expireStale(): void {
    const now = new Date();
    for (const approval of this.approvals.values()) {
      if (approval.status === "pending" && new Date(approval.expiresAt) < now) {
        approval.status = "expired";
        const waiter = this.waiters.get(approval.id);
        if (waiter) {
          waiter.resolve("expired");
          this.waiters.delete(approval.id);
        }
      }
    }
  }
}
