import { generatePairingCode } from "./lib/ids.js";

interface PairingCode {
  code: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
}

export class PairingService {
  private codes = new Map<string, PairingCode>();
  private authorizedChatId?: number;
  private readonly ttlMs = 5 * 60_000;
  private readonly maxAttempts = 5;

  createCode(): { code: string; expiresAt: string } {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + this.ttlMs);
    this.codes.set(code, { code, expiresAt, used: false, attempts: 0 });
    return { code, expiresAt: expiresAt.toISOString() };
  }

  confirm(code: string, chatId: number, chatType: string): boolean {
    const entry = this.codes.get(code.toUpperCase());
    if (!entry || entry.used || new Date() > entry.expiresAt) return false;
    if (chatType !== "private") return false;
    entry.attempts += 1;
    if (entry.attempts > this.maxAttempts) return false;
    entry.used = true;
    this.authorizedChatId = chatId;
    return true;
  }

  isAuthorized(chatId: number): boolean {
    return this.authorizedChatId === chatId;
  }

  isPaired(): boolean {
    return this.authorizedChatId !== undefined;
  }

  getAuthorizedChatId(): number | undefined {
    return this.authorizedChatId;
  }

  unpair(): void {
    this.authorizedChatId = undefined;
  }
}
