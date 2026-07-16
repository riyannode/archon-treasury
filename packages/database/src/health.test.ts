import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { connectDatabase, closeDatabase, checkDatabaseHealth } from "./index.js";
import type { DatabaseConfig } from "./config.js";

const testConfig: DatabaseConfig = {
  databaseUrl:
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@localhost:5432/archon_treasury_test",
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
};

describe("database health check", () => {
  beforeEach(async () => {
    await closeDatabase();
    connectDatabase(testConfig);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it("returns healthy with latencyMs", async () => {
    const result = await checkDatabaseHealth();
    expect(result.status).toBe("healthy");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    if (result.status === "healthy") {
      expect(typeof result.latencyMs).toBe("number");
    }
  });

  it("returns unhealthy when pool is not initialized", async () => {
    await closeDatabase();
    const result = await checkDatabaseHealth();
    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.reason).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });
});
