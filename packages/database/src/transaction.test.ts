import { describe, it, expect } from "vitest";
import { buildDatabaseConfig } from "./config.js";

/**
 * Transaction unit tests — no PostgreSQL required.
 * Real transaction commit/rollback tests are in integration.test.ts.
 */
describe("withTransaction", () => {
  it("exists and is importable", async () => {
    const { withTransaction } = await import("./index.js");
    expect(typeof withTransaction).toBe("function");
  });
});

describe("database config validation (unit)", () => {
  it("sslMode disable accepted", () => {
    const config = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost/db",
      sslMode: "disable",
    });
    expect(config.sslMode).toBe("disable");
  });

  it("sslMode require accepted", () => {
    const config = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost/db",
      sslMode: "require",
    });
    expect(config.sslMode).toBe("require");
  });

  it("defaults to disable when omitted", () => {
    const config = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost/db",
    });
    expect(config.sslMode).toBe("disable");
  });

  it("rejects invalid sslMode", () => {
    expect(() =>
      buildDatabaseConfig({
        databaseUrl: "postgresql://localhost/db",
        sslMode: "verify-full" as "disable",
      }),
    ).toThrow();
  });
});
