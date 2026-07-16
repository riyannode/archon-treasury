import { describe, it, expect } from "vitest";
import { buildDatabaseConfig, databaseConfigSchema } from "./config.js";

describe("databaseConfigSchema", () => {
  it("parses valid config with all fields", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "postgresql://user:pass@localhost:5432/db",
      poolMin: 2,
      poolMax: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 10000,
    });
    expect(result.databaseUrl).toBe("postgresql://user:pass@localhost:5432/db");
    expect(result.poolMin).toBe(2);
    expect(result.poolMax).toBe(20);
    expect(result.idleTimeoutMs).toBe(30000);
    expect(result.connectionTimeoutMs).toBe(10000);
  });

  it("applies safe defaults when pool settings are omitted", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "postgresql://localhost:5432/db",
    });
    expect(result.poolMin).toBe(0);
    expect(result.poolMax).toBe(10);
    expect(result.idleTimeoutMs).toBe(10_000);
    expect(result.connectionTimeoutMs).toBe(5_000);
  });

  it("rejects empty databaseUrl", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "" }),
    ).toThrow();
  });

  it("rejects poolMax less than 1", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "pg://x", poolMax: 0 }),
    ).toThrow();
  });

  it("rejects poolMax greater than 100", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "pg://x", poolMax: 101 }),
    ).toThrow();
  });

  it("rejects negative poolMin", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "pg://x", poolMin: -1 }),
    ).toThrow();
  });

  it("rejects idleTimeoutMs below minimum", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "pg://x", idleTimeoutMs: 500 }),
    ).toThrow();
  });

  it("rejects connectionTimeoutMs below minimum", () => {
    expect(() =>
      databaseConfigSchema.parse({
        databaseUrl: "pg://x",
        connectionTimeoutMs: 500,
      }),
    ).toThrow();
  });
});

describe("buildDatabaseConfig", () => {
  it("builds config from databaseUrl and env", () => {
    const config = buildDatabaseConfig("postgresql://localhost:5432/db", {
      DATABASE_POOL_MIN: "1",
      DATABASE_POOL_MAX: "15",
      DATABASE_IDLE_TIMEOUT_MS: "20000",
      DATABASE_CONNECTION_TIMEOUT_MS: "8000",
    });
    expect(config.databaseUrl).toBe("postgresql://localhost:5432/db");
    expect(config.poolMin).toBe(1);
    expect(config.poolMax).toBe(15);
    expect(config.idleTimeoutMs).toBe(20000);
    expect(config.connectionTimeoutMs).toBe(8000);
  });

  it("uses defaults when env has no pool settings", () => {
    const config = buildDatabaseConfig("postgresql://localhost:5432/db", {});
    expect(config.poolMin).toBe(0);
    expect(config.poolMax).toBe(10);
    expect(config.idleTimeoutMs).toBe(10_000);
    expect(config.connectionTimeoutMs).toBe(5_000);
  });
});
