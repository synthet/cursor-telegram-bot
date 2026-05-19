import { describe, expect, it, vi } from "vitest";
import { TelegramPoller } from "./polling.js";
import type { TelegramClient } from "./client.js";
import type { UpdateRouter } from "./router.js";

describe("TelegramPoller offset", () => {
  it("advances offset after processing updates", async () => {
    const client = {
      deleteWebhook: vi.fn().mockResolvedValue(true),
      getUpdates: vi.fn().mockImplementation((params: { offset?: number }) => {
        if ((params.offset ?? 0) > 0) {
          return Promise.resolve([]);
        }
        return Promise.resolve([{ update_id: 1, message: { text: "/start" } }]);
      }),
    } as unknown as TelegramClient;

    const router = {
      handleUpdate: vi.fn().mockResolvedValue(undefined),
    } as unknown as UpdateRouter;

    const poller = new TelegramPoller({ client, router });
    void poller.start();
    await new Promise((r) => setTimeout(r, 150));
    poller.stop();
    await new Promise((r) => setTimeout(r, 600));

    expect(client.getUpdates).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
    );
    expect(router.handleUpdate).toHaveBeenCalled();
  });
});
