import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeHookPayload } from "./normalize.js";

export interface RunHookOptions {
  hookName: string;
  blocking?: boolean;
}

export async function runHook(options: RunHookOptions): Promise<number> {
  loadProjectEnv();
  const bridgeUrl = process.env.AGENT_REMOTE_BRIDGE_URL;
  const bridgeToken = process.env.AGENT_REMOTE_BRIDGE_TOKEN;

  const stdin = await readStdin();
  let raw: unknown = {};
  if (stdin.trim()) {
    try {
      raw = JSON.parse(stdin);
    } catch {
      raw = { raw: stdin };
    }
  }

  const event = normalizeHookPayload(raw, options.hookName);

  if (!bridgeUrl || !bridgeToken) {
    console.error("Bridge not configured; failing closed for blocking hooks");
    return options.blocking ? 1 : 0;
  }

  try {
    const res = await fetch(`${bridgeUrl}/hooks/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bridgeToken}`,
      },
      body: JSON.stringify(event),
    });
    const body = (await res.json()) as { blocked?: boolean; approvalId?: string };

    if (options.blocking && body.blocked && body.approvalId) {
      const deadline = Date.now() + 300_000;
      while (Date.now() < deadline) {
        await sleep(2000);
        const approvalRes = await fetch(`${bridgeUrl}/approvals`, {
          headers: { Authorization: `Bearer ${bridgeToken}` },
        });
        const approvals = (await approvalRes.json()) as {
          approvals: Array<{ id: string; status: string }>;
        };
        const approval = approvals.approvals.find((a) => a.id === body.approvalId);
        if (approval?.status === "approved") return 0;
        if (approval?.status === "denied" || approval?.status === "expired") return 1;
      }
      return 1;
    }

    return 0;
  } catch {
    return options.blocking ? 1 : 0;
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Load repo `.env` from Cursor workspace root (does not override existing env). */
function loadProjectEnv(): void {
  const startDir =
    process.env.CURSOR_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const envPath = resolve(dir, ".env");
    if (existsSync(envPath)) {
      for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        if (!key || process.env[key] !== undefined) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
