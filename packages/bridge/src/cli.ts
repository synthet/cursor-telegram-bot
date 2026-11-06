#!/usr/bin/env node
import { loadEnvFiles } from "./load-env.js";
import { startBridge } from "./index.js";

async function main(): Promise<void> {
  loadEnvFiles();

  const host = process.env.AGENT_REMOTE_BRIDGE_HOST ?? "127.0.0.1";
  const port = Number(process.env.AGENT_REMOTE_BRIDGE_PORT ?? 0);
  const workspaceUri = process.env.AGENT_REMOTE_WORKSPACE_URI ?? process.cwd();
  const workspaceName = process.env.AGENT_REMOTE_WORKSPACE_NAME ?? "workspace";
  // Extension cwd is bridge-dist; also load workspace .env for local dev tokens.
  loadEnvFiles(workspaceUri);

  const telegramToken = process.env.AGENT_REMOTE_TELEGRAM_TOKEN?.trim() || undefined;

  const { url, ctx, stop } = await startBridge({
    host,
    port,
    workspaceUri,
    workspaceName,
    telegramToken,
  });

  console.log(JSON.stringify({ type: "bridge-ready", url, authToken: ctx.authToken }));

  process.on("SIGINT", async () => {
    await stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await stop();
    process.exit(0);
  });
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`bridge-fatal: ${message}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
