export type CallbackKind = "approval" | "session" | "mcp" | "loopback";

export interface ParsedCallbackData {
  version: string;
  kind: CallbackKind;
  action: string;
  id: string;
  nonce: string;
  raw: string;
}

const CALLBACK_RE = /^v(\d+):([a-z]+):([a-z_]+):([^:]+):([^:]+)$/;

export function parseCallbackData(data: string): ParsedCallbackData | null {
  const match = data.match(CALLBACK_RE);
  if (!match) return null;
  const kind = match[2] as CallbackKind;
  if (!["approval", "session", "mcp", "loopback"].includes(kind)) return null;
  return {
    version: match[1]!,
    kind,
    action: match[3]!,
    id: match[4]!,
    nonce: match[5]!,
    raw: data,
  };
}

export function buildCallbackData(
  kind: CallbackKind,
  action: string,
  id: string,
  nonce: string,
): string {
  return `v1:${kind}:${action}:${id}:${nonce}`;
}
