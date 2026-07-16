import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { DatabaseConfig } from "./config.js";
import * as schema from "./schema/index.js";

const { Pool } = pg;

/**
 * Typed database instance.
 * Uses actual schema type so future business tables are available in queries.
 */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Typed transaction instance.
 * Same schema type as Database — transaction callbacks get full schema access.
 */
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * The active database pool and Drizzle instance.
 * Singleton per process — created lazily via connectDatabase().
 */
let pool: pg.Pool | null = null;
let db: Database | null = null;

/**
 * Build pg SSL configuration from sslMode.
 *
 * ssl: "require" means encrypted connection but does NOT verify the server
 * certificate (rejectUnauthorized defaults to false in node-postgres).
 * This is documented as a limitation: we do NOT claim production-grade
 * verified TLS. Certificate verification requires additional CA configuration
 * that is out of scope for this PR.
 */
function buildSslConfig(sslMode: string): pg.PoolConfig["ssl"] {
  if (sslMode === "require") {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * Connect to the database. Creates a connection pool (singleton).
 *
 * Safe to call multiple times — subsequent calls return the existing instance.
 * No connection is established at module import time.
 */
export function connectDatabase(config: DatabaseConfig): Database {
  if (pool && db) {
    return db;
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    min: config.poolMin,
    max: config.poolMax,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    ssl: buildSslConfig(config.sslMode),
  });

  db = drizzle(pool, { schema });

  return db;
}

/**
 * Get the active database instance.
 * Throws if connectDatabase() has not been called.
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error(
      "Database not initialized. Call connectDatabase() before using getDatabase().",
    );
  }
  return db;
}

/**
 * Get the raw pg Pool (for health checks, migrations, etc.).
 * Throws if connectDatabase() has not been called.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error(
      "Database not initialized. Call connectDatabase() before using getPool().",
    );
  }
  return pool;
}

/**
 * Gracefully close the database pool.
 * Safe to call multiple times. Returns a resolved promise when no pool exists.
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
