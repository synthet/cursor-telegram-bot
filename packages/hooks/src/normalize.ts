import type { HookEvent, HookPhase } from "@agent-remote/shared";
import { generateId } from "./lib/ids.js";

const HOOK_NAME_TO_PHASE: Record<string, HookPhase> = {
  "agent-remote-hook": "unknown",
  "agent-remote-before-shell": "before_shell",
  "agent-remote-after-shell": "after_shell",
  "agent-remote-before-file-edit": "before_file_edit",
  "agent-remote-after-file-edit": "after_file_edit",
  "agent-remote-before-tool": "before_tool",
  "agent-remote-after-tool": "after_tool",
};

export function normalizeHookPayload(
  raw: unknown,
  hookName: string,
): HookEvent {
  const payload = typeof raw === "object" && raw !== null ? raw : { value: raw };
  const obj = payload as Record<string, unknown>;
  const phase =
    HOOK_NAME_TO_PHASE[hookName] ??
    (typeof obj.phase === "string" ? (obj.phase as HookPhase) : "unknown");

  return {
    id: generateId("hook"),
    source: "cursor-hook",
    hookName,
    sessionId: typeof obj.sessionId === "string" ? obj.sessionId : undefined,
    workspaceUri: typeof obj.workspaceUri === "string" ? obj.workspaceUri : undefined,
    timestamp: new Date().toISOString(),
    phase,
    risk: typeof obj.risk === "string" ? (obj.risk as HookEvent["risk"]) : undefined,
    summary:
      typeof obj.summary === "string"
        ? obj.summary
        : typeof obj.command === "string"
          ? obj.command
          : hookName,
    payload,
  };
}
