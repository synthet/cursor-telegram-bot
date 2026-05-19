import { z } from "zod";

export const SessionIdSchema = z.string().min(1);
export type SessionId = z.infer<typeof SessionIdSchema>;

export const SessionStatusSchema = z.enum([
  "starting",
  "running",
  "waiting_approval",
  "waiting_user",
  "completed",
  "failed",
  "stopped",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionAdapterSchema = z.enum([
  "cursor-cli",
  "cursor-sdk",
  "cursor-api",
  "mcp",
  "noop",
  "experimental",
]);
export type SessionAdapter = z.infer<typeof SessionAdapterSchema>;

export const SessionSchema = z.object({
  id: SessionIdSchema,
  workspaceUri: z.string(),
  workspaceName: z.string(),
  adapter: SessionAdapterSchema,
  status: SessionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  title: z.string().optional(),
  lastMessage: z.string().optional(),
  lastError: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const StartSessionInputSchema = z.object({
  prompt: z.string().min(1),
  workspaceUri: z.string(),
  workspaceName: z.string(),
  title: z.string().optional(),
});
export type StartSessionInput = z.infer<typeof StartSessionInputSchema>;

export const SessionHandleSchema = z.object({
  sessionId: SessionIdSchema,
});
export type SessionHandle = z.infer<typeof SessionHandleSchema>;
