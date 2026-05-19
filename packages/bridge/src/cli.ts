#!/usr/bin/env node
import { startBridge } from "./index.js";

const host = process.env.AGENT_REMOTE_BRIDGE_HOST ?? "127.0.0.1";
const port = Number(process.env.AGENT_REMOTE_BRIDGE_PORT ?? 0);
const workspaceUri = process.env.AGENT_REMOTE_WORKSPACE_URI ?? process.cwd();
const workspaceName = process.env.AGENT_REMOTE_WORKSPACE_NAME ?? "workspace";
const telegramToken = process.env.AGENT_REMOTE_TELEGRAM_TOKEN;

const { url, ctx, stop } = await startBridge({
  host,
  port,
  workspaceUri,
  workspaceName,
  telegramToken,
});

const addr = url;
console.log(JSON.stringify({ type: "bridge-ready", url: addr, authToken: ctx.authToken }));

process.on("SIGINT", async () => {
  await stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stop();
  process.exit(0);
});
