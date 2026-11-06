import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { BridgeContext } from "./bridge-context.js";
import { createBridgeServer } from "./server.js";

describe("bridge server", () => {
  let url: string;
  let token: string;
  let server: ReturnType<typeof createBridgeServer>;
  let ctx: BridgeContext;
  const telegramCalls: Array<{ chatId: number; text: string; extra?: Record<string, unknown> }> =
    [];

  beforeAll(async () => {
    ctx = new BridgeContext({
      host: "127.0.0.1",
      port: 0,
      workspaceUri: "/tmp/test",
      workspaceName: "test",
    });
    await ctx.initialize();
    ctx.telegramSender = async (chatId, text, extra) => {
      telegramCalls.push({ chatId, text, extra });
      return { message_id: telegramCalls.length };
    };
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

  it("rejects malformed pairing body via Zod", async () => {
    const res = await fetch(`${url}/pairing/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code: "X", chatId: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });

  it("loopback enqueue rejects spoofed telegram source", async () => {
    const res = await fetch(`${url}/loopback/sess_x/enqueue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "telegram",
        kind: "approval_decision",
        payload: { approvalId: "fake", decision: "approved" },
      }),
    });
    expect(res.status).toBe(400);
  });

  it("ask-user pushes a Telegram message and resolves on plain text", async () => {
    telegramCalls.length = 0;
    // pair first so chat is authorized
    const create = await fetch(`${url}/pairing/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const { code } = await create.json();
    await fetch(`${url}/pairing/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, chatId: 99, chatType: "private" }),
    });

    const askPromise = fetch(`${url}/internal/mcp/ask-user`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "sess_ask",
        question: "Are we good?",
        timeoutMs: 5_000,
      }),
    });

    // wait for the bridge to register and dispatch the prompt
    await new Promise((r) => setTimeout(r, 50));
    expect(telegramCalls.length).toBeGreaterThan(0);
    expect(telegramCalls.at(-1)!.text).toContain("Are we good?");

    // user "answers" by resolving the oldest ask via context
    ctx.resolveOldestAsk(99, "yes");

    const res = await askPromise;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.answer).toBe("yes");
  });
});
