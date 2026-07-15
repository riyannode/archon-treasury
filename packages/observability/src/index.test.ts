import { describe, it, expect, vi } from "vitest";
import { createLogger } from "./index.js";

describe("createLogger", () => {
  it("logs info messages", () => {
    const spy = vi.spyOn(process.stdout, "write");
    const logger = createLogger("info");
    logger.info("hello");
    expect(spy).toHaveBeenCalled();
    const output = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(output.level).toBe("info");
    expect(output.message).toBe("hello");
    expect(output.timestamp).toBeDefined();
    spy.mockRestore();
  });

  it("filters debug when level is info", () => {
    const spy = vi.spyOn(process.stdout, "write");
    const logger = createLogger("info");
    logger.debug("should not appear");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("includes meta fields", () => {
    const spy = vi.spyOn(process.stdout, "write");
    const logger = createLogger("debug");
    logger.info("test", { requestId: "abc-123" });
    const output = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(output.requestId).toBe("abc-123");
    spy.mockRestore();
  });
});
