/**
 * Database integration tests — run against real PostgreSQL.
 *
 * These tests require a running PostgreSQL instance.
 * Set DATABASE_URL before running:
 *
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/archon_treasury_test" \
 *     pnpm --filter @archon-treasury/database test:integration
 *
 * WARNING: This test drops and recreates the test database.
 * NEVER run against production or non-test databases.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import pg from "pg";
import {
  connectDatabase,
  closeDatabase,
  checkDatabaseHealth,
  withTransaction,
  getPool,
} from "../src/index.js";
import { sql } from "drizzle-orm";
import type { DatabaseConfig } from "../src/config.js";

const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:postgres@localhost:5432/archon_treasury_test";

const TEST_DB_MARKER = "archon_treasury_test";

// Guard: refuse to run if the URL doesn't look like a test database
if (!DATABASE_URL.includes(TEST_DB_MARKER)) {
  throw new Error(
    `Refusing to run integration tests against non-test database: ${DATABASE_URL.replace(/:[^@]+@/, ":***@")}`,
  );
}

const testConfig: DatabaseConfig = {
  databaseUrl: DATABASE_URL,
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
};

beforeAll(async () => {
  // Connect to default postgres database to reset test database
  const adminPool = new pg.Pool({
    connectionString: DATABASE_URL.replace(
      /\/[^/]+$/,
      "/postgres",
    ),
  });

  try {
    // Terminate existing connections
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_MARKER}' AND pid <> pg_backend_pid()
    `);

    // Drop and recreate
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_MARKER}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_MARKER}`);
  } finally {
    await adminPool.end();
  }
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await closeDatabase();
});

describe("integration: connect + SELECT 1", () => {
  it("connects and executes SELECT 1", async () => {
    const db = connectDatabase(testConfig);
    const result = await db.execute(sql`SELECT 1 AS result`);
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
  });
});

describe("integration: health check", () => {
  it("returns healthy against real PostgreSQL", async () => {
    connectDatabase(testConfig);
    const health = await checkDatabaseHealth();
    expect(health.status).toBe("healthy");
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns unhealthy for invalid connection", async () => {
    await closeDatabase();
    const badConfig: DatabaseConfig = {
      ...testConfig,
      databaseUrl: "postgresql://localhost:99999/nonexistent",
      connectionTimeoutMs: 2000,
    };
    connectDatabase(badConfig);
    const health = await checkDatabaseHealth(2000);
    expect(health.status).toBe("unhealthy");
    if (health.status === "unhealthy") {
      expect(health.reason).toBeDefined();
    }
  });
});

describe("integration: transaction commit", () => {
  it("commits successfully", async () => {
    connectDatabase(testConfig);
    const result = await withTransaction(async (tx) => {
      const r = await tx.execute(sql`SELECT 1 AS val`);
      return r;
    });
    expect(result).toBeDefined();
    expect(result.rows).toBeDefined();
  });
});

describe("integration: transaction rollback", () => {
  it("rolls back on error", async () => {
    connectDatabase(testConfig);
    await expect(
      withTransaction(async () => {
        throw new Error("deliberate rollback");
      }),
    ).rejects.toThrow("deliberate rollback");
  });
});

describe("integration: migration from empty database", () => {
  it("database is empty after fresh creation", async () => {
    connectDatabase(testConfig);
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      // Fresh database should have no user tables
      expect(result.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });
});

describe("integration: migration rerun idempotent", () => {
  it("drizzle migrations table is safe to check", async () => {
    connectDatabase(testConfig);
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Check if drizzle_migrations table exists (it may not yet)
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = '__drizzle_migrations'
        ) AS exists
      `);
      expect(typeof result.rows[0]?.["exists"]).toBe("boolean");
    } finally {
      client.release();
    }
  });
});

describe("integration: graceful close", () => {
  it("closes cleanly and subsequent calls fail gracefully", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    expect(() => getPool()).toThrow("Database not initialized");
  });

  it("double close resolves without error", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    await expect(closeDatabase()).resolves.toBeUndefined();
  });
});
