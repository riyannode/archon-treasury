import { describe, it, expect } from "vitest";
import { createApp } from "./app.js";

describe("API startup smoke test", () => {
  it("starts on a custom PORT and responds", async () => {
    const app = createApp();
    const port = 0; // OS-assigned ephemeral port

    await new Promise<void>((resolve) => app.listen(port, resolve));

    const addr = app.address();
    expect(addr).toBeDefined();
    expect(addr).not.toBeNull();
    expect(typeof addr).toBe("object");

    const { port: boundPort } = addr as { port: number };

    // Fetch the health endpoint
    const res = await fetch(`http://localhost:${boundPort}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "archon-treasury-api" });

    await new Promise<void>((resolve) => app.close(() => resolve()));
  });
});
