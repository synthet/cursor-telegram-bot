import { DEFAULT_RATE_LIMITS } from "@agent-remote/shared";

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly limits = DEFAULT_RATE_LIMITS) {}

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }

  checkChatCommand(chatId: number): boolean {
    return this.check(`chat:${chatId}`, this.limits.chatCommandsPerMinute, 60_000);
  }

  checkPairing(chatId: number): boolean {
    return this.check(
      `pair:${chatId}`,
      this.limits.pairingAttemptsPerFiveMinutes,
      5 * 60_000,
    );
  }
}
