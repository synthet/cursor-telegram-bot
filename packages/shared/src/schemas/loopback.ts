import { z } from "zod";
import { SessionIdSchema } from "./session.js";

export const LoopbackSourceSchema = z.enum([
  "telegram",
  "mcp",
  "hook",
  "extension",
  "bridge",
  "agent",
]);
export type LoopbackSource = z.infer<typeof LoopbackSourceSchema>;

export const LoopbackKindSchema = z.enum([
  "user_message",
  "approval_decision",
  "cancel",
  "continue",
  "status_request",
  "hook_signal",
  "checkpoint",
  "diff_report",
  "message",
]);
export type LoopbackKind = z.infer<typeof LoopbackKindSchema>;

export const LoopbackStatusSchema = z.enum([
  "queued",
  "delivered",
  "acknowledged",
  "failed",
  "expired",
]);
export type LoopbackStatus = z.infer<typeof LoopbackStatusSchema>;

export const LoopbackEventSchema = z.object({
  id: z.string(),
  sessionId: SessionIdSchema,
  source: LoopbackSourceSchema,
  kind: LoopbackKindSchema,
  payload: z.unknown(),
  correlationId: z.string().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  status: LoopbackStatusSchema,
});
export type LoopbackEvent = z.infer<typeof LoopbackEventSchema>;

export const LoopbackEnqueueInputSchema = z.object({
  sessionId: SessionIdSchema,
  source: LoopbackSourceSchema,
  kind: LoopbackKindSchema,
  payload: z.unknown(),
  correlationId: z.string().optional(),
});
export type LoopbackEnqueueInput = z.infer<typeof LoopbackEnqueueInputSchema>;
