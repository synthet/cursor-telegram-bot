export interface BridgeClientConfig {
  baseUrl: string;
  authToken: string;
}

export class BridgeClient {
  constructor(private readonly config: BridgeClientConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.authToken}`,
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? res.statusText);
    }
    return res.json() as Promise<T>;
  }

  getConfigStatus() {
    return this.request<{
      bridgeRunning: boolean;
      telegramPaired: boolean;
      sessionCount: number;
      pendingApprovals: number;
      pendingLoopback: number;
      mcpRunning: boolean;
      hooksInstalled: boolean;
      activeAdapter?: string;
      lastError?: string;
    }>("/config/status");
  }

  confirmPairing(code: string, chatId: number, chatType: string) {
    return this.request<{ ok: boolean }>("/pairing/confirm", {
      method: "POST",
      body: JSON.stringify({ code, chatId, chatType }),
    });
  }

  listSessions() {
    return this.request<{ sessions: Array<{ id: string; status: string; title?: string }> }>(
      "/sessions",
    );
  }

  createSession(input: {
    prompt: string;
    workspaceUri: string;
    workspaceName: string;
  }) {
    return this.request<{ session: { id: string; status: string; adapter: string } }>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  sendMessage(sessionId: string, message: string) {
    return this.request(`/sessions/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  stopSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/stop`, { method: "POST" });
  }

  getLogs(sessionId: string) {
    return this.request<{ logs: Array<{ message: string; level: string }> }>(
      `/sessions/${sessionId}/logs`,
    );
  }

  getDiff(sessionId: string) {
    return this.request<{ filesChanged: number; files: Array<{ path: string }> }>(
      `/sessions/${sessionId}/diff`,
    );
  }

  decideApproval(id: string, action: "approve" | "deny", nonce?: string) {
    return this.request(`/approvals/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ nonce }),
    });
  }

  getMcpStatus() {
    return this.request<{ running: boolean; tools: string[]; waiters: number }>("/mcp/status");
  }

  getHooksStatus() {
    return this.request<{ installed: boolean; recentEvents: number }>("/hooks/status");
  }

  getLoopbackPending() {
    return this.request<{ events: unknown[] }>("/events/recent");
  }

  resolveAskUser(correlationId: string, answer: string) {
    return this.request("/internal/mcp/resolve-ask", {
      method: "POST",
      body: JSON.stringify({ correlationId, answer }),
    });
  }
}
