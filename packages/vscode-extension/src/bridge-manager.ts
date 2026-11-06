import * as vscode from "vscode";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import * as path from "node:path";

export function resolveBridgeCli(
  extensionPath: string,
  workspacePath?: string,
): string {
  const candidates = [
    process.env.AGENT_REMOTE_BRIDGE_CLI,
    path.join(extensionPath, "bridge-dist", "cli.js"),
    workspacePath
      ? path.join(workspacePath, "packages", "vscode-extension", "bridge-dist", "cli.js")
      : undefined,
    workspacePath
      ? path.join(workspacePath, "packages", "bridge", "dist", "cli.js")
      : undefined,
    path.join(extensionPath, "..", "bridge", "dist", "cli.js"),
  ].filter((p): p is string => Boolean(p));

  for (const entry of candidates) {
    if (existsSync(entry)) return entry;
  }

  throw new Error(
    "Bridge CLI not found. Run pnpm build, reinstall the extension, or set AGENT_REMOTE_BRIDGE_CLI.",
  );
}

/** Child env safe for `spawn` (string values only). */
export function sanitizeSpawnEnv(
  base: NodeJS.ProcessEnv,
  overrides: Record<string, string>,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined) env[key] = value;
  }
  Object.assign(env, overrides);
  return env;
}

export function nodeSpawnCommand(): { command: string; extraEnv: Record<string, string> } {
  const execPath = process.execPath;
  const isElectron =
    Boolean(process.versions.electron) ||
    /(?:cursor|code)\.exe$/i.test(execPath) ||
    /(?:Cursor|Code)\.app/i.test(execPath);

  if (isElectron) {
    return {
      command: execPath,
      extraEnv: { ELECTRON_RUN_AS_NODE: "1" },
    };
  }
  return { command: "node", extraEnv: {} };
}

export interface BridgeState {
  url?: string;
  authToken?: string;
  running: boolean;
}

export class BridgeProcessManager {
  private proc?: ChildProcess;
  state: BridgeState = { running: false };
  private getSecret: (key: string) => Promise<string | undefined> = async () => undefined;

  constructor(
    private readonly extensionPath: string,
    getSecret?: (key: string) => Promise<string | undefined>,
  ) {
    if (getSecret) this.getSecret = getSecret;
  }

  async start(workspaceFolder: vscode.WorkspaceFolder): Promise<BridgeState> {
    if (this.state.running) return this.state;

    const storedToken = (await this.getSecret("agentRemote.telegramToken"))?.trim();

    const bridgeEntry = resolveBridgeCli(
      this.extensionPath,
      workspaceFolder.uri.fsPath,
    );
    ensureBridgeDistPackageJson(bridgeEntry);

    const { command, extraEnv } = nodeSpawnCommand();
    const env = sanitizeSpawnEnv(process.env, {
      ...extraEnv,
      AGENT_REMOTE_BRIDGE_HOST: "127.0.0.1",
      AGENT_REMOTE_BRIDGE_PORT: "0",
      AGENT_REMOTE_WORKSPACE_URI: workspaceFolder.uri.fsPath,
      AGENT_REMOTE_WORKSPACE_NAME: workspaceFolder.name,
      ...(storedToken ? { AGENT_REMOTE_TELEGRAM_TOKEN: storedToken } : {}),
    });

    this.proc = spawn(command, [bridgeEntry], {
      env,
      cwd: path.dirname(bridgeEntry),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const ready = await new Promise<BridgeState>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(this.formatBridgeFailure("Bridge start timeout (15s)", stderrBuf)));
      }, 15_000);
      let buf = "";
      let stderrBuf = "";

      const fail = (message: string) => {
        clearTimeout(timeout);
        reject(new Error(this.formatBridgeFailure(message, stderrBuf)));
      };

      this.proc!.stdout?.on("data", (d: Buffer) => {
        buf += d.toString();
        const line = buf.split("\n").find((l) => l.includes("bridge-ready"));
        if (!line) return;
        try {
          const parsed = JSON.parse(line) as { url: string; authToken: string };
          clearTimeout(timeout);
          this.state = {
            running: true,
            url: parsed.url,
            authToken: parsed.authToken,
          };
          resolve(this.state);
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
        }
      });

      this.proc!.stderr?.on("data", (d: Buffer) => {
        stderrBuf += d.toString();
        if (stderrBuf.length > 16_000) stderrBuf = stderrBuf.slice(-16_000);
      });

      this.proc!.on("error", (err) => {
        fail(err.message);
      });

      this.proc!.on("exit", (code, signal) => {
        if (!this.state.running) {
          const detail =
            code !== null
              ? `Bridge exited with code ${code}`
              : `Bridge exited (${signal ?? "unknown signal"})`;
          fail(detail);
        }
      });
    });

    return ready;
  }

  private formatBridgeFailure(message: string, stderr: string): string {
    const errLine = stderr
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith("bridge-fatal:") || l.includes("Error"));
    const tail = stderr.trim().split(/\r?\n/).slice(-4).join("\n");
    if (errLine) return `${message}\n${errLine}`;
    if (tail) return `${message}\n${tail}`;
    return message;
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill("SIGTERM");
      this.proc = undefined;
    }
    this.state = { running: false };
  }

  async restart(workspaceFolder: vscode.WorkspaceFolder): Promise<BridgeState> {
    await this.stop();
    return this.start(workspaceFolder);
  }
}

/** Written next to bundled bridge CLI so Node treats it as ESM. */
export function ensureBridgeDistPackageJson(bridgeCliPath: string): void {
  const dir = path.dirname(bridgeCliPath);
  const pkgPath = path.join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify({ type: "module" }, null, 2));
  }
}
