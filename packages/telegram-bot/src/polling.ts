import { TelegramError } from "@agent-remote/shared";
import type { TelegramClient } from "./client.js";
import type { UpdateRouter } from "./router.js";

export interface PollingOptions {
  client: TelegramClient;
  router: UpdateRouter;
  onError?: (err: Error) => void;
}

export class TelegramPoller {
  private offset = 0;
  private running = false;

  constructor(private readonly options: PollingOptions) {}

  async start(): Promise<void> {
    this.running = true;
    await this.options.client.deleteWebhook().catch(() => undefined);

    while (this.running) {
      try {
        if (!this.running) break;
        const updates = (await this.options.client.getUpdates({
          offset: this.offset,
          timeout: 25,
          limit: 50,
          allowed_updates: ["message", "callback_query", "my_chat_member"],
        })) as Array<{ update_id: number } & Record<string, unknown>>;

        if (updates.length === 0) {
          await sleep(500);
          if (!this.running) break;
          continue;
        }
        for (const update of updates) {
          if (!this.running) break;
          this.offset = Math.max(this.offset, update.update_id + 1);
          await this.options.router.handleUpdate(update);
        }
        if (!this.running) break;
      } catch (err) {
        if (!this.running) break;
        if (err instanceof TelegramError && err.statusCode === 409) {
          await this.options.client.deleteWebhook();
          continue;
        }
        if (err instanceof TelegramError && err.statusCode === 429) {
          const retryAfter =
            (err as TelegramError & { retryAfter?: number }).retryAfter ?? 5;
          await sleep(retryAfter * 1000);
          continue;
        }
        this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
        await sleep(3000);
      }
    }
  }

  stop(): void {
    this.running = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
