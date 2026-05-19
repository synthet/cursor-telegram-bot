import { z } from "zod";
import { RiskLevelSchema } from "./approval.js";
import { SessionIdSchema } from "./session.js";

export const HookPhaseSchema = z.enum([
  "agent_start",
  "agent_stop",
  "before_tool",
  "after_tool",
  "before_shell",
  "after_shell",
  "before_file_edit",
  "after_file_edit",
  "before_mcp_tool",
  "after_mcp_tool",
  "error",
  "completion",
  "unknown",
]);
export type HookPhase = z.infer<typeof HookPhaseSchema>;

export const HookEventSchema = z.object({
  id: z.string(),
  source: z.literal("cursor-hook"),
  hookName: z.string(),
  sessionId: SessionIdSchema.optional(),
  workspaceUri: z.string().optional(),
  timestamp: z.string().datetime(),
  phase: HookPhaseSchema,
  risk: RiskLevelSchema.optional(),
  summary: z.string(),
  payload: z.unknown(),
});
export type HookEvent = z.infer<typeof HookEventSchema>;

export const HookPolicyModeSchema = z.enum(["observe", "notify", "approval", "block"]);
export type HookPolicyMode = z.infer<typeof HookPolicyModeSchema>;
