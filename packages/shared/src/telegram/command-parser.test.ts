import { describe, expect, it } from "vitest";
import { parseTelegramCommand } from "./command-parser.js";

describe("parseTelegramCommand", () => {
  it("parses /start", () => {
    expect(parseTelegramCommand("/start")).toEqual({
      name: "start",
      args: [],
      raw: "/start",
    });
  });

  it("parses /pair with code", () => {
    expect(parseTelegramCommand("/pair ABC123")).toEqual({
      name: "pair",
      args: ["ABC123"],
      raw: "/pair ABC123",
    });
  });

  it("parses /ask with session and message", () => {
    expect(parseTelegramCommand("/ask sess_1 run tests")).toEqual({
      name: "ask",
      args: ["sess_1", "run tests"],
      raw: "/ask sess_1 run tests",
    });
  });

  it("returns null for unknown command", () => {
    expect(parseTelegramCommand("/unknown")).toBeNull();
  });
});
