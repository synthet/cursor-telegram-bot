import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { z, type ZodSchema } from "zod";
import {
  ApprovalIdSchema,
  AuthError,
  CreateSessionInputSchema,
  DEFAULT_RATE_LIMITS,
  HookEventSchema,
  LoopbackEnqueueInputSchema,
  MCP_TOOL_NAME_LIST,
  MessageSessionInputSchema,
  PairingConfirmInputSchema,
  RemoteAskUserInputSchema,
  RemoteNotifyInputSchema,
  RemoteRequestApprovalInputSchema,
  buildCallbackData,
  redact,
} from "@agent-remote/shared";
import type { BridgeContext } from "./bridge-context.js";
import { generateId } from "./lib/ids.js";

function readBody(req: IncomingMessage, maxBytes = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    req.on("data", (c: Buffer) => {
      length += c.length;
      if (length > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function parseJson<T>(req: IncomingMessage, schema: ZodSchema<T>): Promise<T> {
  const raw = await readBody(req);
  let parsed: unknown = {};
  if (raw.trim().length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ValidationError("Invalid JSON");
    }
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

class ValidationError extends Error {
  readonly statusCode = 400;
}

class RateLimitError extends Error {
  readonly statusCode = 429;
  constructor(message = "Rate limit exceeded") {
    super(message);
  }
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

function clientKey(req: IncomingMessage): string {
  return (
    (req.socket.remoteAddress ?? "unknown") + ":" + (req.headers["x-bridge-client"] ?? "default")
  );
}

const InternalAskUserInputSchema = RemoteAskUserInputSchema.extend({
  correlationId: z.string().optional(),
});
const WaitApprovalInputSchema = z.object({
  approvalId: ApprovalIdSchema,
  timeoutMs: z.number().int().positive().optional(),
});
const ResolveAskInputSchema = z.object({
  correlationId: z.string().min(1),
  answer: z.string().min(1),
});
const PairingCreateAckSchema = z.object({});

// External loopback enqueue from non-bridge callers: source must not be telegram/bridge.
const ExternalLoopbackEnqueueSchema = LoopbackEnqueueInputSchema.omit({
  sessionId: true,
}).extend({
  source: z.enum(["agent", "extension", "mcp", "hook"]),
});

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
        await parseJson(req, PairingCreateAckSchema).catch(() => undefined);
        const result = ctx.pairing.createCode();
        ctx.audit.append("pairing.create", "Pairing code created");
        ctx.events.publish({
          type: "audit",
          entry: {
            id: generateId("audit"),
            type: "pairing.create",
            timestamp: new Date().toISOString(),
            summary: "code created",
          },
        });
        json(res, 200, result);
        return;
      }

      if (path === "/pairing/confirm" && method === "POST") {
        const body = await parseJson(req, PairingConfirmInputSchema);
        if (!ctx.rateLimiter.checkPairing(body.chatId)) {
          throw new RateLimitError("Too many pairing attempts");
        }
        const ok = ctx.pairing.confirm(body.code, body.chatId, body.chatType);
        if (ok) {
          ctx.audit.append("pairing.success", `Chat ${body.chatId} paired`);
          ctx.events.publish({
            type: "audit",
            entry: {
              id: generateId("audit"),
              type: "pairing.success",
              timestamp: new Date().toISOString(),
              summary: "paired",
            },
          });
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
        const body = await parseJson(req, CreateSessionInputSchema);
        if (
          !ctx.rateLimiter.check(
            `sessions:${clientKey(req)}`,
            DEFAULT_RATE_LIMITS.sessionMessagesPerMinute,
            60_000,
          )
        ) {
          throw new RateLimitError();
        }
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
          ctx.events.publish({ type: "session", sessionId: session.id, action: "start" });
          json(res, 201, { session });
        } catch (err) {
          const session = ctx.sessions.create(body, adapterType);
          ctx.sessions.updateStatus(
            session.id,
            "failed",
            err instanceof Error ? err.message : String(err),
          );
          ctx.events.publish({ type: "session", sessionId: session.id, action: "fail" });
          json(res, 201, { session });
        }
        return;
      }

      const sessionMatch = path.match(/^\/sessions\/([^/]+)(\/message|\/stop|\/logs|\/diff)?$/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1]!;
        const sub = sessionMatch[2];

        if (sub === "/message" && method === "POST") {
          const body = await parseJson(req, MessageSessionInputSchema);
          if (
            !ctx.rateLimiter.check(
              `msg:${sessionId}`,
              DEFAULT_RATE_LIMITS.sessionMessagesPerMinute,
              60_000,
            )
          ) {
            throw new RateLimitError();
          }
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
          ctx.events.publish({ type: "session", sessionId, action: "stop" });
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
        const body = await parseJson(req, z.object({ nonce: z.string().optional() }));
        if (
          !ctx.rateLimiter.check(
            `appr:${clientKey(req)}`,
            DEFAULT_RATE_LIMITS.approvalActionsPerMinute,
            60_000,
          )
        ) {
          throw new RateLimitError();
        }
        const status = action === "approve" ? "approved" : "denied";
        const approval = ctx.approvals.decide(id!, status, body.nonce);
        if (approval) {
          ctx.loopback.enqueue({
            sessionId: approval.sessionId,
            source: "telegram",
            kind: "approval_decision",
            payload: { approvalId: id, decision: status },
          });
          ctx.events.publish({ type: "approval", approvalId: id!, action: status });
        }
        json(res, 200, { approval });
        return;
      }

      if (path === "/hooks/events" && method === "POST") {
        const event = await parseJson(req, HookEventSchema);
        if (
          !ctx.rateLimiter.check(
            `hook:${clientKey(req)}`,
            DEFAULT_RATE_LIMITS.hookEventsPerMinute,
            60_000,
          )
        ) {
          throw new RateLimitError();
        }
        ctx.recordHookEvent(event.id, event.summary);
        ctx.events.publish({ type: "hook", hookId: event.id });

        if (ctx.hookPolicy.shouldRequestApproval(event)) {
          const approval = ctx.approvals.create({
            sessionId: event.sessionId ?? "unknown",
            risk: event.risk ?? ctx.hookPolicy.classifyRisk(event.summary),
            actionType: "hook_block",
            summary: redact(event.summary),
            details: redact(JSON.stringify(event.payload)).slice(0, 500),
          });
          await sendApprovalToTelegram(
            ctx,
            approval.id,
            approval.summary,
            approval.risk,
            approval.nonce,
          );
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
          tools: MCP_TOOL_NAME_LIST,
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
          if (
            !ctx.rateLimiter.check(
              `lb:${clientKey(req)}`,
              DEFAULT_RATE_LIMITS.loopbackEventsPerMinute,
              60_000,
            )
          ) {
            throw new RateLimitError();
          }
          const body = await parseJson(req, ExternalLoopbackEnqueueSchema);
          const event = ctx.loopback.enqueue({
            sessionId,
            source: body.source,
            kind: body.kind,
            payload: body.payload,
            correlationId: body.correlationId,
          });
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
        const body = await parseJson(req, RemoteNotifyInputSchema);
        const chatId = ctx.pairing.getAuthorizedChatId();
        if (chatId && ctx.telegramSender) {
          const safe = redact(`[${body.level.toUpperCase()}] ${body.title}\n${body.message}`);
          await ctx.telegramSender(chatId, safe).catch(() => undefined);
        }
        json(res, 200, { ok: true });
        return;
      }

      if (path === "/internal/mcp/request-approval" && method === "POST") {
        const body = await parseJson(req, RemoteRequestApprovalInputSchema);
        const approval = ctx.approvals.create({
          sessionId: body.sessionId,
          risk: body.risk,
          actionType: body.actionType,
          summary: redact(body.summary),
          details: redact(body.details).slice(0, 500),
          timeoutMs: body.timeoutMs,
        });
        await sendApprovalToTelegram(
          ctx,
          approval.id,
          approval.summary,
          approval.risk,
          approval.nonce,
        );
        json(res, 200, {
          approvalId: approval.id,
          nonce: approval.nonce,
          callbackApprove: buildCallbackData("approval", "approve", approval.id, approval.nonce),
        });
        return;
      }

      if (path === "/internal/mcp/wait-approval" && method === "POST") {
        const body = await parseJson(req, WaitApprovalInputSchema);
        const decision = await ctx.approvals.waitForDecision(
          body.approvalId,
          body.timeoutMs ?? 300_000,
        );
        json(res, 200, {
          approvalId: body.approvalId,
          decision:
            decision === "approved" ? "approved" : decision === "denied" ? "denied" : "expired",
          decidedAt: new Date().toISOString(),
        });
        return;
      }

      if (path === "/internal/mcp/ask-user" && method === "POST") {
        const body = await parseJson(req, InternalAskUserInputSchema);
        const correlationId = body.correlationId ?? generateId("ask");
        const chatId = ctx.pairing.getAuthorizedChatId();
        if (!chatId) {
          json(res, 400, { error: "Not paired" });
          return;
        }

        const waiterPromise = ctx.registerAskWaiter({
          correlationId,
          chatId,
          question: body.question,
          choices: body.choices,
          timeoutMs: body.timeoutMs ?? 300_000,
        });

        if (ctx.telegramSender) {
          const safeQ = redact(body.question);
          const choiceText =
            body.choices && body.choices.length > 0
              ? `\n\nChoices: ${body.choices.map((c, i) => `${i + 1}. ${c}`).join(" · ")}`
              : "";
          await ctx
            .telegramSender(
              chatId,
              `<b>Question</b>\n${safeQ}${choiceText}\n\nReply in this chat with your answer.`,
            )
            .catch(() => undefined);
        }

        const result = await waiterPromise;
        json(res, 200, { correlationId, ...result });
        return;
      }

      if (path === "/internal/mcp/resolve-ask" && method === "POST") {
        const body = await parseJson(req, ResolveAskInputSchema);
        const ok = ctx.resolveAsk(body.correlationId, { answer: body.answer, status: "answered" });
        json(res, 200, { ok });
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (err) {
      if (err instanceof AuthError) {
        json(res, 401, { error: err.message });
        return;
      }
      if (err instanceof ValidationError) {
        json(res, 400, { error: err.message });
        return;
      }
      if (err instanceof RateLimitError) {
        json(res, 429, { error: err.message });
        return;
      }
      ctx.lastError = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: ctx.lastError });
    }
  });
}

async function sendApprovalToTelegram(
  ctx: BridgeContext,
  approvalId: string,
  summary: string,
  risk: string,
  nonce: string,
): Promise<void> {
  const chatId = ctx.pairing.getAuthorizedChatId();
  if (!chatId || !ctx.telegramSender) return;

  const text = `<b>Approval needed</b> (${risk})\n${summary}\n\nID: <code>${approvalId}</code>`;
  await ctx
    .telegramSender(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Approve",
              callback_data: buildCallbackData("approval", "approve", approvalId, nonce),
            },
            {
              text: "Deny",
              callback_data: buildCallbackData("approval", "deny", approvalId, nonce),
            },
          ],
        ],
      },
    })
    .catch(() => undefined);
}
