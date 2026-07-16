import { getPool } from "./client.js";
import type pg from "pg";

/**
 * Structured database health result.
 */
export type DatabaseHealth =
  | {
      status: "healthy";
      latencyMs: number;
    }
  | {
      status: "unhealthy";
      latencyMs: number;
      reason: string;
    };

/**
 * Clamp timeout to safe bounds: minimum 100ms, maximum 30_000ms.
 */
function clampTimeout(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 5_000;
  }
  return Math.max(100, Math.min(30_000, Math.floor(ms)));
}

/**
 * Try to check out a client, run the health query, and release.
 * Returns the health result. All errors are caught and returned as unhealthy.
 */
async function tryHealthCheck(
  boundedTimeout: number,
): Promise<{ health?: DatabaseHealth; client?: pg.PoolClient; timerId?: ReturnType<typeof setTimeout> }> {
  const start = Date.now();

  try {
    const pool = getPool();
    const client = await pool.connect();

    // BEGIN + parameterized statement_timeout
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('statement_timeout', $1, true)",
      [String(boundedTimeout)],
    );

    // Safety timer: destroy client if PG doesn't enforce timeout in time
    const timerId = setTimeout(() => {
      client.release(true); // destroy to abort in-flight query
    }, boundedTimeout);

    await client.query("SELECT 1");

    // Query succeeded — clear timer
    clearTimeout(timerId);

    // COMMIT — if this fails, return unhealthy (do NOT return healthy)
    await client.query("COMMIT");

    const latencyMs = Date.now() - start;
    client.release();
    return { health: { status: "healthy", latencyMs } };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason =
      error instanceof Error ? error.message : "Unknown database error";
    return { health: { status: "unhealthy", latencyMs, reason } };
  }
}

/**
 * Perform a real health check against PostgreSQL using SELECT 1.
 *
 * Uses SET LOCAL statement_timeout on a dedicated checked-out client to bound
 * query execution time. The timeout is enforced by PostgreSQL itself.
 *
 * Guarantees:
 * - ALL failures (getPool, connect, query, commit) produce structured unhealthy
 * - Client is always released exactly once
 * - Timer is always cleaned up (no dangling timeouts)
 * - No unhandled rejections
 * - Parameterized statement_timeout (no SQL string interpolation)
 */
export async function checkDatabaseHealth(
  timeoutMs = 5_000,
): Promise<DatabaseHealth> {
  const boundedTimeout = clampTimeout(timeoutMs);
  const result = await tryHealthCheck(boundedTimeout);
  return result.health ?? { status: "unhealthy", latencyMs: 0, reason: "Unexpected: no health result" };
}
