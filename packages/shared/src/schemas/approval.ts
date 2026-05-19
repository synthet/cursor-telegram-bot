import { z } from "zod";
import { SessionIdSchema } from "./session.js";

export const ApprovalIdSchema = z.string().min(1);
export type ApprovalId = z.infer<typeof ApprovalIdSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ActionTypeSchema = z.enum([
  "shell",
  "file_write",
  "file_delete",
  "git",
  "network",
  "secret_access",
  "deploy",
  "mcp_tool",
  "hook_block",
  "other",
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ApprovalStatusSchema = z.enum(["pending", "approved", "denied", "expired"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z.object({
  id: ApprovalIdSchema,
  sessionId: SessionIdSchema,
  risk: RiskLevelSchema,
  actionType: ActionTypeSchema,
  summary: z.string(),
  details: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: ApprovalStatusSchema,
  nonce: z.string(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
