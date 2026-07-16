import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { DatabaseConfig } from "./config.js";
import * as schema from "./schema/index.js";

const { Pool } = pg;

/**
 * The active database pool and Drizzle instance.
 * Singleton per process — created lazily via connectDatabase().
 */
let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

/**
 * Connect to the database. Creates a connection pool (singleton).
 *
 * Safe to call multiple times — subsequent calls return the existing instance.
 * No connection is established at module import time.
 */
export function connectDatabase(config: DatabaseConfig): NodePgDatabase<typeof schema> {
  if (pool && db) {
    return db;
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    min: config.poolMin,
    max: config.poolMax,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
  });

  db = drizzle(pool, { schema });

  return db;
}

/**
 * Get the active database instance.
 * Throws if connectDatabase() has not been called.
 */
export function getDatabase(): NodePgDatabase<typeof schema> {
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
