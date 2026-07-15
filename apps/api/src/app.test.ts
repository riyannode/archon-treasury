import { describe, it, expect } from "vitest";
import { createApp } from "./app.js";

describe("createApp", () => {
  it("returns a server instance", () => {
    const server = createApp();
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe("function");
    server.close();
  });
});
