import { TelegramError } from "@agent-remote/shared";

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

export interface TelegramClientOptions {
  token: string;
  fetchImpl?: typeof fetch;
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TelegramClientOptions) {
    this.baseUrl = `https://api.telegram.org/bot${options.token}`;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as TelegramApiResponse<T>;
    if (!data.ok) {
      const err = new TelegramError(
        data.description ?? "Telegram API error",
        "TELEGRAM_API",
        data.error_code,
      );
      if (data.error_code === 429 && data.parameters?.retry_after) {
        (err as TelegramError & { retryAfter: number }).retryAfter = data.parameters.retry_after;
      }
      throw err;
    }
    return data.result as T;
  }

  getMe() {
    return this.call<{ id: number; username?: string }>("getMe");
  }

  getUpdates(params: Record<string, unknown>) {
    return this.call<unknown[]>("getUpdates", params);
  }

  deleteWebhook() {
    return this.call<boolean>("deleteWebhook");
  }

  sendMessage(chatId: number, text: string, extra?: Record<string, unknown>) {
    return this.call<{ message_id: number }>("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...extra,
    });
  }

  editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    extra?: Record<string, unknown>,
  ) {
    return this.call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...extra,
    });
  }

  answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
  }
}
