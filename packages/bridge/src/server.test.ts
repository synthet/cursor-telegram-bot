import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { BridgeContext } from "./bridge-context.js";
import { createBridgeServer } from "./server.js";

describe("bridge server", () => {
  let url: string;
  let token: string;
  let server: ReturnType<typeof createBridgeServer>;

  beforeAll(async () => {
    const ctx = new BridgeContext({
      host: "127.0.0.1",
      port: 0,
      workspaceUri: "/tmp/test",
      workspaceName: "test",
    });
    await ctx.initialize();
    token = ctx.authToken;
    server = createBridgeServer(ctx);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    url = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /health returns safe metadata", async () => {
    const res = await fetch(`${url}/health`);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeDefined();
    expect(body.authToken).toBeUndefined();
  });

  it("requires auth for protected routes", async () => {
    const res = await fetch(`${url}/config/status`);
    expect(res.status).toBe(401);
  });

  it("GET /config/status with auth", async () => {
    const res = await fetch(`${url}/config/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bridgeRunning).toBe(true);
  });

  it("pairing code expires on invalid confirm", async () => {
    const create = await fetch(`${url}/pairing/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const { code } = await create.json();
    const bad = await fetch(`${url}/pairing/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "WRONG", chatId: 1, chatType: "private" }),
    });
    expect(bad.status).toBe(400);
    const good = await fetch(`${url}/pairing/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, chatId: 12345, chatType: "private" }),
    });
    expect(good.status).toBe(200);
  });
});
