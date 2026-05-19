import { BridgeContext, type BridgeConfig } from "./bridge-context.js";
import { createBridgeServer } from "./server.js";
import {
  BridgeClient,
  TelegramClient,
  TelegramPoller,
  UpdateRouter,
} from "@agent-remote/telegram-bot";

export { BridgeContext, type BridgeConfig } from "./bridge-context.js";
export { createBridgeServer } from "./server.js";

export interface StartBridgeOptions extends BridgeConfig {
  telegramToken?: string;
}

export async function startBridge(options: StartBridgeOptions): Promise<{
  ctx: BridgeContext;
  url: string;
  stop: () => Promise<void>;
}> {
  const ctx = new BridgeContext(options);
  if (options.telegramToken) ctx.telegramToken = options.telegramToken;
  await ctx.initialize();

  const server = createBridgeServer(ctx);
  await new Promise<void>((resolve, reject) => {
    server.listen(options.port, options.host, () => resolve());
    server.on("error", reject);
  });

  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : options.port;
  const url = `http://${options.host}:${port}`;

  let poller: TelegramPoller | undefined;

  if (ctx.telegramToken) {
    const tgClient = new TelegramClient({ token: ctx.telegramToken });
    const bridgeClient = new BridgeClient({ baseUrl: url, authToken: ctx.authToken });
    const router = new UpdateRouter({
      client: tgClient,
      bridge: bridgeClient,
      isAuthorized: (chatId) => ctx.pairing.isAuthorized(chatId),
      getWorkspace: () => ({
        uri: options.workspaceUri,
        name: options.workspaceName,
      }),
    });
    poller = new TelegramPoller({ client: tgClient, router });
    void poller.start();
    ctx.audit.append("telegram.start", "Telegram polling started");
  }

  return {
    ctx,
    url,
    stop: async () => {
      poller?.stop();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      ctx.audit.append("bridge.stop", "Bridge stopped");
    },
  };
}
