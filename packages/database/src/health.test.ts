import { describe, it, expect, afterEach } from "vitest";
import { connectDatabase, closeDatabase, checkDatabaseHealth } from "./index.js";
import type { DatabaseConfig } from "./config.js";

const badConfig: DatabaseConfig = {
  databaseUrl: "postgresql://localhost:99999/nonexistent",
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 1_000,
  sslMode: "disable",
};

describe("database health check", () => {
  afterEach(async () => {
    await closeDatabase();
  });

  it("getPool not initialized → unhealthy, not throw", async () => {
    await closeDatabase();
    const result = await checkDatabaseHealth();
    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.reason).toContain("not initialized");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns unhealthy for invalid connection (pool.connect failure)", async () => {
    connectDatabase(badConfig);
    const result = await checkDatabaseHealth(2_000);
    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});
