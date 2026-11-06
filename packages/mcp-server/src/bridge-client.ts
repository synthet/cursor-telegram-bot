export class McpBridgeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        `Bridge unavailable: ${(body as { error?: string }).error ?? res.statusText}. Start the bridge from the extension.`,
      );
    }
    return res.json() as Promise<T>;
  }

  getStatus() {
    return this.request<{
      bridgeRunning: boolean;
      telegramPaired: boolean;
      pendingApprovals: number;
      sessionCount: number;
    }>("/config/status");
  }

  notify(body: { sessionId?: string; level: string; title: string; message: string }) {
    return this.request("/internal/mcp/notify", { method: "POST", body: JSON.stringify(body) });
  }

  requestApproval(body: Record<string, unknown>) {
    return this.request<{ approvalId: string; nonce: string }>("/internal/mcp/request-approval", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  waitApproval(approvalId: string, timeoutMs: number) {
    return this.request<{ decision: string; decidedAt?: string }>("/internal/mcp/wait-approval", {
      method: "POST",
      body: JSON.stringify({ approvalId, timeoutMs }),
    });
  }

  askUser(body: Record<string, unknown>) {
    return this.request<{
      correlationId: string;
      answer?: string;
      choice?: string;
      status: "answered" | "expired" | "cancelled";
    }>("/internal/mcp/ask-user", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  enqueueLoopback(body: Record<string, unknown>) {
    const sessionId = body.sessionId as string;
    return this.request<{ eventId: string; accepted: boolean }>(`/loopback/${sessionId}/enqueue`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  listSessions() {
    return this.request<{ sessions: unknown[] }>("/sessions");
  }

  listApprovals() {
    return this.request<{ approvals: unknown[] }>("/approvals");
  }

  recentEvents() {
    return this.request<{ events: unknown[] }>("/events/recent");
  }
}
