const PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\d{8,10}:[A-Za-z0-9_-]{35,}/g, replacement: "[REDACTED_TELEGRAM_TOKEN]" },
  { pattern: /ghp_[A-Za-z0-9]{36}/g, replacement: "[REDACTED_GITHUB_TOKEN]" },
  { pattern: /sk-[A-Za-z0-9]{20,}/g, replacement: "[REDACTED_OPENAI_KEY]" },
  { pattern: /sk-ant-[A-Za-z0-9-]{20,}/g, replacement: "[REDACTED_ANTHROPIC_KEY]" },
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: "Bearer [REDACTED]" },
  {
    pattern: /(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=[^\s]+/gi,
    replacement: "$1=[REDACTED]",
  },
  {
    pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    pattern: /(postgres|mysql|mongodb)(\+srv)?:\/\/[^\s@]+@[^\s]+/gi,
    replacement: "$1://[REDACTED]@[HOST]",
  },
];

export function redact(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PATTERNS) {
    if (typeof replacement === "string") {
      result = result.replace(pattern, replacement);
    }
  }
  // .env style lines
  result = result.replace(/^([A-Z][A-Z0-9_]*)=(.+)$/gm, (_, key: string) => `${key}=[REDACTED]`);
  return result;
}
