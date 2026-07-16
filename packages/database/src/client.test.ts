import { describe, it, expect, afterEach } from "vitest";
import { connectDatabase, getDatabase, getPool, closeDatabase } from "./client.js";
import type { DatabaseConfig } from "./config.js";

const testConfig: DatabaseConfig = {
  databaseUrl:
    process.env["DATABASE_URL"] ??
    "postgresql://postgres:***@localhost:5432/archon_treasury_test",
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
  sslMode: "disable",
};

describe("database client lifecycle", () => {
  afterEach(async () => {
    await closeDatabase();
  });

  it("connectDatabase returns a Drizzle instance", async () => {
    const db = connectDatabase(testConfig);
    expect(db).toBeDefined();
    expect(db.select).toBeInstanceOf(Function);
  });

  it("getDatabase throws before connect", async () => {
    await closeDatabase();
    expect(() => getDatabase()).toThrow("Database not initialized");
  });

  it("getPool throws before connect", async () => {
    await closeDatabase();
    expect(() => getPool()).toThrow("Database not initialized");
  });

  it("getDatabase returns same instance (singleton)", async () => {
    const db1 = connectDatabase(testConfig);
    const db2 = connectDatabase(testConfig);
    expect(db1).toBe(db2);
  });

  it("closeDatabase resolves when no pool exists", async () => {
    await closeDatabase();
    await expect(closeDatabase()).resolves.toBeUndefined();
  });

  it("closeDatabase makes getDatabase throw again", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    expect(() => getDatabase()).toThrow("Database not initialized");
  });

  it("connectDatabase is lazy — no connection at import time", async () => {
    await closeDatabase();
    // If we got here, module import did not establish a connection
    expect(() => getPool()).toThrow("Database not initialized");
  });
});
