import { z } from "zod";
import { ActionTypeSchema, RiskLevelSchema } from "./approval.js";
import { SessionIdSchema } from "./session.js";
import { DiffFileSchema } from "./log.js";

export const MCP_SERVER_NAME = "agent-remote-control";

/** Cursor-compatible MCP tool names (alphanumeric + underscore only). */
export const MCP_TOOL_NAMES = {
  status: "remote_status",
  notify: "remote_notify",
  requestApproval: "remote_request_approval",
  askUser: "remote_ask_user",
  checkpoint: "remote_checkpoint",
  reportDiff: "remote_report_diff",
  loopbackEnqueue: "remote_loopback_enqueue",
} as const;

export const MCP_TOOL_NAME_LIST = Object.values(MCP_TOOL_NAMES);

export const RemoteStatusOutputSchema = z.object({
  bridgeRunning: z.boolean(),
  telegramPaired: z.boolean(),
  activeSessionId: z.string().optional(),
  pendingApprovals: z.number(),
});
export type RemoteStatusOutput = z.infer<typeof RemoteStatusOutputSchema>;

export const RemoteNotifyInputSchema = z.object({
  sessionId: SessionIdSchema.optional(),
  level: z.enum(["info", "warn", "error", "success"]),
  title: z.string(),
  message: z.string(),
});

export const RemoteRequestApprovalInputSchema = z.object({
  sessionId: SessionIdSchema,
  risk: RiskLevelSchema,
  actionType: ActionTypeSchema,
  summary: z.string(),
  details: z.string(),
  timeoutMs: z.number().optional(),
});

export const RemoteRequestApprovalOutputSchema = z.object({
  approvalId: z.string(),
  decision: z.enum(["approved", "denied", "expired"]),
  decidedAt: z.string().optional(),
});

export const RemoteAskUserInputSchema = z.object({
  sessionId: SessionIdSchema,
  question: z.string(),
  choices: z.array(z.string()).optional(),
  timeoutMs: z.number().optional(),
});

export const RemoteAskUserOutputSchema = z.object({
  answer: z.string().optional(),
  choice: z.string().optional(),
  status: z.enum(["answered", "expired", "cancelled"]),
});

export const RemoteCheckpointInputSchema = z.object({
  sessionId: SessionIdSchema,
  title: z.string(),
  summary: z.string(),
  filesChanged: z.array(z.string()).optional(),
});

export const RemoteCheckpointOutputSchema = z.object({
  checkpointId: z.string(),
});

export const RemoteReportDiffInputSchema = z.object({
  sessionId: SessionIdSchema,
  files: z.array(DiffFileSchema),
  summary: z.string().optional(),
});

export const RemoteReportDiffOutputSchema = z.object({
  accepted: z.boolean(),
});

export const RemoteLoopbackEnqueueInputSchema = z.object({
  sessionId: SessionIdSchema,
  source: z.enum(["agent", "telegram", "hook", "extension"]),
  kind: z.enum(["message", "approval_decision", "cancel", "continue", "status_request"]),
  payload: z.unknown(),
  correlationId: z.string().optional(),
});

export const RemoteLoopbackEnqueueOutputSchema = z.object({
  eventId: z.string(),
  accepted: z.boolean(),
});

export const MCP_RESOURCE_URIS = {
  sessions: "agent-remote://sessions",
  session: (id: string) => `agent-remote://sessions/${id}`,
  approvals: "agent-remote://approvals",
  eventsRecent: "agent-remote://events/recent",
  configStatus: "agent-remote://config/status",
} as const;

export const MCP_PROMPT_NAMES = [
  "remote-safe-plan",
  "remote-approval-required",
  "remote-session-summary",
  "remote-diff-summary",
] as const;
