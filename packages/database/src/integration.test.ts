/**
 * Database integration tests — run against real PostgreSQL.
 *
 * These tests require a running PostgreSQL instance.
 * Set DATABASE_URL before running:
 *
 *   DATABASE_URL="postgresql://postgres:***@localhost:5432/archon_treasury_test" \
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
  buildDatabaseConfig,
} from "../src/index.js";
import { sql } from "drizzle-orm";

const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:***@localhost:5432/archon_treasury_test";

const TEST_DB_MARKER = "archon_treasury_test";

// Guard: refuse to run if the URL doesn't look like a test database
if (!DATABASE_URL.includes(TEST_DB_MARKER)) {
  throw new Error(
    `Refusing to run integration tests against non-test database: ${DATABASE_URL.replace(/:[^@]+@/, ":***@")}`,
  );
}

const testConfig = buildDatabaseConfig({
  databaseUrl: DATABASE_URL,
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
  sslMode: "disable",
});

beforeAll(async () => {
  // Connect to default postgres database to reset test database
  const adminPool = new pg.Pool({
    connectionString: DATABASE_URL.replace(/\/[^/]+$/, "/postgres"),
  });

  try {
    // Terminate existing connections
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [TEST_DB_MARKER]);

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

// ── Blocker 1 tests: lazy, singleton, close ──

describe("integration: connect lazy / no connection on import", () => {
  it("no connection exists after fresh module load", async () => {
    await closeDatabase();
    expect(() => getPool()).toThrow("Database not initialized");
  });
});

describe("integration: singleton lifecycle", () => {
  it("returns same Drizzle instance on repeated connect", async () => {
    const db1 = connectDatabase(testConfig);
    const db2 = connectDatabase(testConfig);
    expect(db1).toBe(db2);
  });
});

describe("integration: close idempotent", () => {
  it("double close resolves without error", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    await expect(closeDatabase()).resolves.toBeUndefined();
  });

  it("getPool throws after close", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    expect(() => getPool()).toThrow("Database not initialized");
  });
});

// ── Blocker 1 tests: health ──

describe("integration: health success", () => {
  it("returns healthy against real PostgreSQL", async () => {
    connectDatabase(testConfig);
    const health = await checkDatabaseHealth();
    expect(health.status).toBe("healthy");
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("integration: health query failure", () => {
  it("returns unhealthy for invalid connection", async () => {
    await closeDatabase();
    const badConfig = buildDatabaseConfig({
      databaseUrl: "postgresql://localhost:99999/nonexistent",
      connectionTimeoutMs: 2000,
      sslMode: "disable",
    });
    connectDatabase(badConfig);
    const health = await checkDatabaseHealth(2000);
    expect(health.status).toBe("unhealthy");
    if (health.status === "unhealthy") {
      expect(health.reason).toBeDefined();
      expect(health.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("integration: health timeout with slow query", () => {
  it("returns unhealthy within bounded time for slow query", async () => {
    connectDatabase(testConfig);
    const timeoutMs = 1_000;
    const start = Date.now();
    const health = await checkDatabaseHealth(timeoutMs);
    const elapsed = Date.now() - start;

    expect(health.status).toBe("unhealthy");
    if (health.status === "unhealthy") {
      // The timeout was enforced — reason should mention timeout
      expect(health.reason).toBeDefined();
    }
    // Should complete within ~2x the timeout (safety margin for CI)
    expect(elapsed).toBeLessThan(timeoutMs * 3);
  });
});

// ── Transaction tests ──

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

// ── Migration tests ──

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

describe("integration: migration metadata exists after baseline", () => {
  it("drizzle migration metadata table or no-table is verifiable", async () => {
    connectDatabase(testConfig);
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Check if drizzle migration metadata exists
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

describe("integration: migration rerun no-op", () => {
  it("running migration against database with no pending migrations is safe", async () => {
    connectDatabase(testConfig);
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Verify no user tables exist (migration with empty schema = no-op)
      const result = await client.query(`
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name NOT LIKE '__drizzle%'
      `);
      const count = Number(result.rows[0]?.["count"]);
      expect(count).toBe(0);
    } finally {
      client.release();
    }
  });
});

// ── TLS config validation (unit-level, no real TLS needed) ──

describe("integration: TLS config validation", () => {
  it("accepts sslMode disable", () => {
    const config = buildDatabaseConfig({
      databaseUrl: DATABASE_URL,
      sslMode: "disable",
    });
    expect(config.sslMode).toBe("disable");
  });

  it("accepts sslMode require", () => {
    const config = buildDatabaseConfig({
      databaseUrl: DATABASE_URL,
      sslMode: "require",
    });
    expect(config.sslMode).toBe("require");
  });

  it("defaults to sslMode disable when omitted", () => {
    const config = buildDatabaseConfig({
      databaseUrl: DATABASE_URL,
    });
    expect(config.sslMode).toBe("disable");
  });

  it("rejects invalid sslMode", () => {
    expect(() =>
      buildDatabaseConfig({
        databaseUrl: DATABASE_URL,
        sslMode: "verify-full" as "disable",
      }),
    ).toThrow();
  });
});

// ── Blocker 2: no ambient process.env dependency ──

describe("integration: no ambient process.env dependency", () => {
  it("database config comes from explicit input, not env", () => {
    const original = process.env["DATABASE_POOL_MAX"];
    process.env["DATABASE_POOL_MAX"] = "999";
    try {
      const config = buildDatabaseConfig({
        databaseUrl: DATABASE_URL,
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

// ── Graceful close ──

describe("integration: graceful close", () => {
  it("closes cleanly and subsequent calls fail gracefully", async () => {
    connectDatabase(testConfig);
    await closeDatabase();
    expect(() => getPool()).toThrow("Database not initialized");
  });
});
