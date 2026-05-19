import { describe, expect, it } from "vitest";
import { buildCallbackData, parseCallbackData } from "./callback-parser.js";

describe("callback parser", () => {
  it("parses approval callback", () => {
    const raw = "v1:approval:approve:appr_123:n_456";
    expect(parseCallbackData(raw)).toEqual({
      version: "1",
      kind: "approval",
      action: "approve",
      id: "appr_123",
      nonce: "n_456",
      raw,
    });
  });

  it("builds callback data", () => {
    expect(buildCallbackData("session", "stop", "sess_1", "n_1")).toBe(
      "v1:session:stop:sess_1:n_1",
    );
  });

  it("rejects invalid format", () => {
    expect(parseCallbackData("invalid")).toBeNull();
  });
});
