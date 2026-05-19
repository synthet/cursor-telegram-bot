import { describe, expect, it } from "vitest";
import { normalizeHookPayload } from "./normalize.js";

describe("normalizeHookPayload", () => {
  it("maps before-shell hook", () => {
    const event = normalizeHookPayload({ command: "npm test" }, "agent-remote-before-shell");
    expect(event.phase).toBe("before_shell");
    expect(event.summary).toBe("npm test");
    expect(event.source).toBe("cursor-hook");
  });
});
