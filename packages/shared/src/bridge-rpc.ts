import { z } from "zod";
import { ApprovalRequestSchema } from "./schemas/approval.js";
import { HookEventSchema } from "./schemas/hook.js";
import { LoopbackEnqueueInputSchema, LoopbackEventSchema } from "./schemas/loopback.js";
import { LogEventSchema } from "./schemas/log.js";
import { SessionSchema, StartSessionInputSchema } from "./schemas/session.js";

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
  uptimeMs: z.number(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ConfigStatusSchema = z.object({
  bridgeRunning: z.boolean(),
  telegramConfigured: z.boolean(),
  telegramPaired: z.boolean(),
  authorizedChatId: z.number().optional(),
  mcpRunning: z.boolean(),
  hooksInstalled: z.boolean(),
  activeAdapter: z.string().optional(),
  sessionCount: z.number(),
  pendingApprovals: z.number(),
  pendingLoopback: z.number(),
  lastError: z.string().optional(),
});
export type ConfigStatus = z.infer<typeof ConfigStatusSchema>;

export const PairingCreateResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string(),
});
export type PairingCreateResponse = z.infer<typeof PairingCreateResponseSchema>;

export const PairingConfirmInputSchema = z.object({
  code: z.string(),
  chatId: z.number(),
  chatType: z.string(),
});
export type PairingConfirmInput = z.infer<typeof PairingConfirmInputSchema>;

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>;

export const CreateSessionInputSchema = StartSessionInputSchema;
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const MessageSessionInputSchema = z.object({
  message: z.string().min(1),
});
export type MessageSessionInput = z.infer<typeof MessageSessionInputSchema>;

export const ApprovalsListResponseSchema = z.object({
  approvals: z.array(ApprovalRequestSchema),
});

export const HookEventInputSchema = HookEventSchema;
export const LoopbackEnqueueBodySchema = LoopbackEnqueueInputSchema;

export const RecentEventsResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      timestamp: z.string(),
      summary: z.string(),
    }),
  ),
});

export const LogsResponseSchema = z.object({
  logs: z.array(LogEventSchema),
});

export const LoopbackListResponseSchema = z.object({
  events: z.array(LoopbackEventSchema),
});

export const McpStatusSchema = z.object({
  running: z.boolean(),
  transport: z.string(),
  tools: z.array(z.string()),
  waiters: z.number(),
  lastError: z.string().optional(),
});

export const HooksStatusSchema = z.object({
  installed: z.boolean(),
  policyMode: z.string(),
  recentEvents: z.number(),
  lastError: z.string().optional(),
});

export const DEFAULT_RATE_LIMITS = {
  chatCommandsPerMinute: 20,
  sessionMessagesPerMinute: 10,
  pairingAttemptsPerFiveMinutes: 5,
  approvalActionsPerMinute: 20,
  mcpToolCallsPerMinute: 60,
  hookEventsPerMinute: 120,
  loopbackEventsPerMinute: 60,
} as const;
