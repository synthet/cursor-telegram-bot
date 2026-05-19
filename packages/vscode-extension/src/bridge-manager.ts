import * as vscode from "vscode";
import { spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";

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

    const storedToken = await this.getSecret("agentRemote.telegramToken");

    const bridgeEntry = path.join(
      this.extensionPath,
      "..",
      "bridge",
      "dist",
      "cli.js",
    );

    const env: Record<string, string> = {
      ...process.env,
      AGENT_REMOTE_BRIDGE_HOST: "127.0.0.1",
      AGENT_REMOTE_BRIDGE_PORT: "0",
      AGENT_REMOTE_WORKSPACE_URI: workspaceFolder.uri.fsPath,
      AGENT_REMOTE_WORKSPACE_NAME: workspaceFolder.name,
    };
    if (storedToken) env.AGENT_REMOTE_TELEGRAM_TOKEN = storedToken;

    this.proc = spawn("node", [bridgeEntry], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const ready = await new Promise<BridgeState>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Bridge start timeout")), 15_000);
      let buf = "";
      this.proc!.stdout?.on("data", (d: Buffer) => {
        buf += d.toString();
        const line = buf.split("\n").find((l) => l.includes("bridge-ready"));
        if (line) {
          try {
            const parsed = JSON.parse(line) as {
              url: string;
              authToken: string;
            };
            clearTimeout(timeout);
            this.state = {
              running: true,
              url: parsed.url,
              authToken: parsed.authToken,
            };
            resolve(this.state);
          } catch (e) {
            reject(e);
          }
        }
      });
      this.proc!.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      this.proc!.on("exit", (code) => {
        if (!this.state.running) {
          clearTimeout(timeout);
          reject(new Error(`Bridge exited with code ${code}`));
        }
      });
    });

    return ready;
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
