import { describe, expect, it } from "vitest";
import { escapeTelegramHtml } from "./escape.js";

describe("escapeTelegramHtml", () => {
  it("escapes html entities", () => {
    expect(escapeTelegramHtml("<script>&")).toBe("&lt;script&gt;&amp;");
  });
});
