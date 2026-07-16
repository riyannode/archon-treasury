import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { connectDatabase, closeDatabase, withTransaction } from "./index.js";
import { sql } from "drizzle-orm";
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

describe("withTransaction", () => {
  beforeEach(async () => {
    await closeDatabase();
    connectDatabase(testConfig);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it("commits when callback succeeds", async () => {
    const result = await withTransaction(async (tx) => {
      const r = await tx.execute(sql`SELECT 1 AS val`);
      return r;
    });
    expect(result).toBeDefined();
  });

  it("rolls back when callback throws", async () => {
    await expect(
      withTransaction(async () => {
        throw new Error("deliberate rollback");
      }),
    ).rejects.toThrow("deliberate rollback");
  });

  it("preserves original error after rollback", async () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }

    await expect(
      withTransaction(async () => {
        throw new CustomError("custom failure");
      }),
    ).rejects.toThrow(CustomError);
  });
});
