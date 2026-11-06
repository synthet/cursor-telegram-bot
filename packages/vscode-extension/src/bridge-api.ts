export class ExtensionBridgeApi {
  constructor(private getState: () => { url?: string; authToken?: string }) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const { url, authToken } = this.getState();
    if (!url || !authToken) throw new Error("Bridge not running");
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...init?.headers,
      },
    });
    return res.json() as Promise<T>;
  }

  getConfigStatus() {
    return this.request<Record<string, unknown>>("/config/status");
  }

  createPairingCode() {
    return this.request<{ code: string; expiresAt: string }>("/pairing/create", {
      method: "POST",
    });
  }

  getMcpStatus() {
    return this.request<Record<string, unknown>>("/mcp/status");
  }

  installHooks() {
    return this.request("/hooks/install", { method: "POST" });
  }

  uninstallHooks() {
    return this.request("/hooks/uninstall", { method: "POST" });
  }
}
