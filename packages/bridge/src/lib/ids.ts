import { randomBytes } from "node:crypto";

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function generateNonce(): string {
  return `n_${randomBytes(4).toString("hex")}`;
}

export function generatePairingCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}
