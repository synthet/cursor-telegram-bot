import { z } from "zod";
import { SessionIdSchema } from "./session.js";

export const LogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogEventSchema = z.object({
  id: z.string(),
  sessionId: SessionIdSchema.optional(),
  timestamp: z.string().datetime(),
  level: LogLevelSchema,
  message: z.string(),
  redacted: z.boolean(),
});
export type LogEvent = z.infer<typeof LogEventSchema>;

export const DiffFileSchema = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted", "renamed", "unknown"]),
  insertions: z.number().optional(),
  deletions: z.number().optional(),
});

export const DiffSummarySchema = z.object({
  sessionId: SessionIdSchema,
  filesChanged: z.number(),
  insertions: z.number(),
  deletions: z.number(),
  files: z.array(DiffFileSchema),
});
export type DiffSummary = z.infer<typeof DiffSummarySchema>;
