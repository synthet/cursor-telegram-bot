import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { AuthError } from "@agent-remote/shared";
import type { BridgeContext } from "./bridge-context.js";
import type { HookEvent } from "@agent-remote/shared";
import { generateId } from "./lib/ids.js";
import { buildCallbackData } from "@agent-remote/shared";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function requireAuth(ctx: BridgeContext, req: IncomingMessage): void {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ctx.authToken}`) {
    throw new AuthError();
  }
}

export function createBridgeServer(ctx: BridgeContext): ReturnType<typeof createServer> {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const path = url.pathname;
      const method = req.method ?? "GET";

      if (path === "/health" && method === "GET") {
        json(res, 200, {
          ok: true,
          version: "0.1.0",
          uptimeMs: Date.now() - ctx.startedAt,
        });
        return;
      }

      if (path !== "/health") requireAuth(ctx, req);

      if (path === "/config/status" && method === "GET") {
        json(res, 200, {
          bridgeRunning: true,
          telegramConfigured: Boolean(ctx.telegramToken),
          telegramPaired: ctx.pairing.isPaired(),
          authorizedChatId: ctx.pairing.getAuthorizedChatId(),
          mcpRunning: ctx.mcpRunning,
          hooksInstalled: ctx.hooksInstalled,
          activeAdapter: ctx.adapters.getActiveId(),
          sessionCount: ctx.sessions.list().length,
          pendingApprovals: ctx.approvals.listPending().length,
          pendingLoopback: ctx.loopback.listPending().length,
          lastError: ctx.lastError,
        });
        return;
      }

      if (path === "/pairing/create" && method === "POST") {
        const result = ctx.pairing.createCode();
        ctx.audit.append("pairing.create", "Pairing code created");
        json(res, 200, result);
        return;
      }

      if (path === "/pairing/confirm" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const ok = ctx.pairing.confirm(body.code, body.chatId, body.chatType);
        if (ok) {
          ctx.audit.append("pairing.success", `Chat ${body.chatId} paired`);
          json(res, 200, { ok: true });
        } else {
          ctx.audit.append("pairing.failed", `Failed pairing for chat ${body.chatId}`);
          json(res, 400, { ok: false, error: "Invalid or expired code" });
        }
        return;
      }

      if (path === "/sessions" && method === "GET") {
        json(res, 200, { sessions: ctx.sessions.list() });
        return;
      }

      if (path === "/sessions" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const adapterId = ctx.adapters.getActiveId();
        const adapterType =
          adapterId === "cursor-cli"
            ? "cursor-cli"
            : adapterId === "cursor-sdk"
              ? "cursor-sdk"
              : "noop";
        try {
          const handle = await ctx.adapters.startSession(body);
          const session = ctx.sessions.register(handle.sessionId, body, adapterType);
          ctx.sessions.updateStatus(session.id, "running");
          json(res, 201, { session });
        } catch (err) {
          const session = ctx.sessions.create(body, adapterType);
          ctx.sessions.updateStatus(
            session.id,
            "failed",
            err instanceof Error ? err.message : String(err),
          );
          json(res, 201, { session });
        }
        return;
      }

      const sessionMatch = path.match(/^\/sessions\/([^/]+)(\/message|\/stop|\/logs|\/diff)?$/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1]!;
        const sub = sessionMatch[2];

        if (sub === "/message" && method === "POST") {
          const body = JSON.parse(await readBody(req));
          ctx.loopback.enqueue({
            sessionId,
            source: "bridge",
            kind: "user_message",
            payload: { message: body.message },
          });
          json(res, 200, { ok: true });
          return;
        }

        if (sub === "/stop" && method === "POST") {
          await ctx.adapters.stopSession(sessionId);
          ctx.sessions.updateStatus(sessionId, "stopped");
          json(res, 200, { ok: true });
          return;
        }

        if (sub === "/logs" && method === "GET") {
          const logs = await ctx.adapters.getRecentLogs(sessionId, 50);
          json(res, 200, { logs });
          return;
        }

        if (sub === "/diff" && method === "GET") {
          const diff = await ctx.adapters.getDiffSummary(sessionId);
          json(res, 200, diff);
          return;
        }

        if (!sub && method === "GET") {
          const session = ctx.sessions.get(sessionId);
          if (!session) {
            json(res, 404, { error: "Not found" });
            return;
          }
          json(res, 200, { session });
          return;
        }
      }

      if (path === "/approvals" && method === "GET") {
        json(res, 200, { approvals: ctx.approvals.listPending() });
        return;
      }

      const approvalMatch = path.match(/^\/approvals\/([^/]+)\/(approve|deny)$/);
      if (approvalMatch && method === "POST") {
        const [, id, action] = approvalMatch;
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const status = action === "approve" ? "approved" : "denied";
        const approval = ctx.approvals.decide(id!, status, body.nonce);
        if (approval) {
          ctx.loopback.enqueue({
            sessionId: approval.sessionId,
            source: "telegram",
            kind: "approval_decision",
            payload: { approvalId: id, decision: status },
          });
        }
        json(res, 200, { approval });
        return;
      }

      if (path === "/hooks/events" && method === "POST") {
        const event = JSON.parse(await readBody(req)) as HookEvent;
        ctx.recordHookEvent(event.id, event.summary);
        ctx.events.publish({ type: "hook", hookId: event.id });

        if (ctx.hookPolicy.shouldRequestApproval(event)) {
          const approval = ctx.approvals.create({
            sessionId: event.sessionId ?? "unknown",
            risk: event.risk ?? ctx.hookPolicy.classifyRisk(event.summary),
            actionType: "hook_block",
            summary: event.summary,
            details: JSON.stringify(event.payload).slice(0, 500),
          });
          json(res, 200, {
            blocked: ctx.hookPolicy.shouldBlock(event),
            approvalId: approval.id,
            nonce: approval.nonce,
          });
          return;
        }

        json(res, 200, { blocked: false });
        return;
      }

      if (path === "/hooks/status" && method === "GET") {
        json(res, 200, {
          installed: ctx.hooksInstalled,
          policyMode: "default",
          recentEvents: ctx.getRecentHookEvents().length,
          lastError: ctx.lastError,
        });
        return;
      }

      if (path === "/hooks/install" && method === "POST") {
        ctx.hooksInstalled = true;
        ctx.audit.append("hooks.install", "Hooks marked installed");
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/hooks/uninstall" && method === "POST") {
        ctx.hooksInstalled = false;
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/mcp/status" && method === "GET") {
        json(res, 200, {
          running: ctx.mcpRunning,
          transport: "stdio",
          tools: [
            "remote.status",
            "remote.notify",
            "remote.request_approval",
            "remote.ask_user",
            "remote.checkpoint",
            "remote.report_diff",
            "remote.loopback_enqueue",
          ],
          waiters: ctx.loopback.getMcpWaiterCount() + ctx.getAskUserWaiterCount(),
        });
        return;
      }

      if (path === "/mcp/restart" && method === "POST") {
        ctx.mcpRunning = true;
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/events/recent" && method === "GET") {
        json(res, 200, {
          events: ctx.audit.getRecent(30).map((e) => ({
            id: e.id,
            type: e.type,
            timestamp: e.timestamp,
            summary: e.summary,
          })),
        });
        return;
      }

      if (path === "/events/stream" && method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        const send = (data: unknown) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        send({ type: "connected" });
        const unsub = ctx.events.subscribe((event) => send(event));
        req.on("close", () => unsub());
        return;
      }

      const loopbackMatch = path.match(/^\/loopback\/([^/]+)(\/enqueue)?$/);
      if (loopbackMatch) {
        const sessionId = loopbackMatch[1]!;
        if (loopbackMatch[2] === "/enqueue" && method === "POST") {
          const body = JSON.parse(await readBody(req));
          const event = ctx.loopback.enqueue({ sessionId, ...body });
          json(res, 200, { eventId: event.id, accepted: true });
          return;
        }
        if (method === "GET") {
          json(res, 200, { events: ctx.loopback.list(sessionId) });
          return;
        }
      }

      // MCP internal endpoints
      if (path === "/internal/mcp/notify" && method === "POST") {
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/internal/mcp/request-approval" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const approval = ctx.approvals.create(body);
        json(res, 200, {
          approvalId: approval.id,
          nonce: approval.nonce,
          callbackApprove: buildCallbackData("approval", "approve", approval.id, approval.nonce),
        });
        return;
      }

      if (path === "/internal/mcp/wait-approval" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const decision = await ctx.approvals.waitForDecision(
          body.approvalId,
          body.timeoutMs ?? 300_000,
        );
        json(res, 200, {
          approvalId: body.approvalId,
          decision: decision === "approved" ? "approved" : decision === "denied" ? "denied" : "expired",
          decidedAt: new Date().toISOString(),
        });
        return;
      }

      if (path === "/internal/mcp/ask-user" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const correlationId = body.correlationId ?? generateId("ask");
        const chatId = ctx.pairing.getAuthorizedChatId();
        if (!chatId) {
          json(res, 400, { error: "Not paired" });
          return;
        }
        ctx.registerAskUserWaiter(correlationId, chatId, (answer) => {
          ctx.loopback.resolveMcpWaiter(correlationId, { answer, status: "answered" });
        });
        json(res, 200, { correlationId, chatId });
        return;
      }

      if (path === "/internal/mcp/resolve-ask" && method === "POST") {
        const body = JSON.parse(await readBody(req));
        const ok = ctx.resolveAskUser(body.correlationId, body.answer);
        json(res, 200, { ok });
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      if (err instanceof AuthError) {
        json(res, 401, { error: err.message });
        return;
      }
      ctx.lastError = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: ctx.lastError });
    }
  });
}
