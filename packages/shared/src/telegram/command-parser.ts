export type TelegramCommandName =
  | "start"
  | "help"
  | "pair"
  | "status"
  | "sessions"
  | "new"
  | "ask"
  | "approve"
  | "deny"
  | "logs"
  | "diff"
  | "stop"
  | "workspace"
  | "mcp"
  | "hooks"
  | "events"
  | "loopback"
  | "settings";

export interface ParsedTelegramCommand {
  name: TelegramCommandName;
  args: string[];
  raw: string;
}

const COMMAND_NAMES = new Set<TelegramCommandName>([
  "start",
  "help",
  "pair",
  "status",
  "sessions",
  "new",
  "ask",
  "approve",
  "deny",
  "logs",
  "diff",
  "stop",
  "workspace",
  "mcp",
  "hooks",
  "events",
  "loopback",
  "settings",
]);

export function parseTelegramCommand(text: string): ParsedTelegramCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const match = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+(.*))?$/s);
  if (!match) return null;

  const name = match[1]!.toLowerCase() as TelegramCommandName;
  if (!COMMAND_NAMES.has(name)) return null;

  const rest = (match[2] ?? "").trim();
  let args: string[] = [];

  if (name === "ask" && rest) {
    const spaceIdx = rest.indexOf(" ");
    if (spaceIdx === -1) {
      args = [rest];
    } else {
      args = [rest.slice(0, spaceIdx), rest.slice(spaceIdx + 1).trim()];
    }
  } else if (name === "new" || name === "pair") {
    args = rest ? [rest] : [];
  } else if (rest) {
    args = rest.split(/\s+/);
  }

  return { name, args, raw: trimmed };
}
