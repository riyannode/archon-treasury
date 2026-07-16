import { describe, it, expect } from "vitest";
import { buildDatabaseConfig, databaseConfigSchema } from "./config.js";

describe("databaseConfigSchema", () => {
  it("parses valid config with all fields", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "postgresql://user:***@localhost:5432/db",
      poolMin: 2,
      poolMax: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 10000,
      sslMode: "require",
    });
    expect(result.databaseUrl).toBe("postgresql://user:***@localhost:5432/db");
    expect(result.poolMin).toBe(2);
    expect(result.poolMax).toBe(20);
    expect(result.idleTimeoutMs).toBe(30000);
    expect(result.connectionTimeoutMs).toBe(10000);
    expect(result.sslMode).toBe("require");
  });

  it("applies safe defaults when pool settings are omitted", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "postgresql://localhost:5432/db",
    });
    expect(result.poolMin).toBe(0);
    expect(result.poolMax).toBe(10);
    expect(result.idleTimeoutMs).toBe(10_000);
    expect(result.connectionTimeoutMs).toBe(5_000);
    expect(result.sslMode).toBe("disable");
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

  it("accepts sslMode disable", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "pg://x",
      sslMode: "disable",
    });
    expect(result.sslMode).toBe("disable");
  });

  it("accepts sslMode require", () => {
    const result = databaseConfigSchema.parse({
      databaseUrl: "pg://x",
      sslMode: "require",
    });
    expect(result.sslMode).toBe("require");
  });

  it("rejects invalid sslMode", () => {
    expect(() =>
      databaseConfigSchema.parse({ databaseUrl: "pg://x", sslMode: "verify-full" }),
    ).toThrow();
  });
});

describe("buildDatabaseConfig", () => {
  it("builds config from explicit input — no ambient process.env", () => {
    const config = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost:5432/db",
      poolMin: 1,
      poolMax: 15,
      idleTimeoutMs: 20000,
      connectionTimeoutMs: 8000,
      sslMode: "require",
    });
    expect(config.databaseUrl).toBe("postgresql://localhost:5432/db");
    expect(config.poolMin).toBe(1);
    expect(config.poolMax).toBe(15);
    expect(config.idleTimeoutMs).toBe(20000);
    expect(config.connectionTimeoutMs).toBe(8000);
    expect(config.sslMode).toBe("require");
  });

  it("uses defaults when optional fields are omitted", () => {
    const config = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost:5432/db",
    });
    expect(config.poolMin).toBe(0);
    expect(config.poolMax).toBe(10);
    expect(config.idleTimeoutMs).toBe(10_000);
    expect(config.connectionTimeoutMs).toBe(5_000);
    expect(config.sslMode).toBe("disable");
  });

  it("does NOT read process.env — changing env does not affect result", () => {
    const original = process.env["DATABASE_POOL_MAX"];
    process.env["DATABASE_POOL_MAX"] = "999";
    try {
      const config = buildDatabaseConfig({
        databaseUrl: "postgresql://localhost:5432/db",
      });
      // Should use default (10), NOT the env value (999)
      expect(config.poolMax).toBe(10);
    } finally {
      if (original === undefined) {
        delete process.env["DATABASE_POOL_MAX"];
      } else {
        process.env["DATABASE_POOL_MAX"] = original;
      }
    }
  });
});
