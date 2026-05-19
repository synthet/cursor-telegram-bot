import { describe, expect, it } from "vitest";
import { redact } from "./redact.js";

describe("redact", () => {
  it("redacts telegram tokens", () => {
    const token = "1234567890:ABCDEFghijklmnopqrstuvwxyz1234567890AB";
    expect(redact(`token=${token}`)).not.toContain(token);
  });

  it("redacts env lines", () => {
    expect(redact("SECRET_KEY=supersecret")).toBe("SECRET_KEY=[REDACTED]");
  });

  it("redacts bearer tokens", () => {
    expect(redact("Authorization: Bearer abc123xyz")).toContain("[REDACTED]");
  });
});
