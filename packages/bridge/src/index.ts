import { BridgeContext, type BridgeConfig } from "./bridge-context.js";
import { createBridgeServer } from "./server.js";
import { DEFAULT_RATE_LIMITS } from "@agent-remote/shared";
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

    // Expose a Telegram sender so the bridge can post approval / ask prompts directly.
    ctx.telegramSender = (chatId, text, extra) => tgClient.sendMessage(chatId, text, extra);

    const router = new UpdateRouter({
      client: tgClient,
      bridge: bridgeClient,
      isAuthorized: (chatId) => ctx.pairing.isAuthorized(chatId),
      getWorkspace: () => ({
        uri: options.workspaceUri,
        name: options.workspaceName,
      }),
      onPlainText: async (chatId, text) => {
        if (
          !ctx.rateLimiter.check(
            `ask-reply:${chatId}`,
            DEFAULT_RATE_LIMITS.chatCommandsPerMinute,
            60_000,
          )
        ) {
          return;
        }
        ctx.resolveOldestAsk(chatId, text);
      },
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
