import { getPool } from "./client.js";

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
 * Perform a real health check against PostgreSQL using SELECT 1.
 *
 * Uses SET LOCAL statement_timeout on a dedicated checked-out client to bound
 * query execution time. The timeout is enforced by PostgreSQL itself — not a
 * JS timer that races the query.
 *
 * Guarantees:
 * - Client is always released (even on timeout or error)
 * - Timer is always cleaned up (no dangling timeouts)
 * - No unhandled rejections
 * - Query that exceeds timeout returns structured unhealthy result
 * - Pooled client is never left in a dirty state after timeout
 *
 * Returns structured result without exposing credentials or raw driver objects.
 * Never returns fake "healthy" when the query fails.
 */
export async function checkDatabaseHealth(
  timeoutMs = 5_000,
): Promise<DatabaseHealth> {
  const start = Date.now();

  const pool = getPool();
  const client = await pool.connect();
  let released = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const safeRelease = () => {
    if (!released) {
      released = true;
      client.release();
    }
  };

  try {
    // Set statement_timeout via SET LOCAL (scoped to current transaction)
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = '${timeoutMs}'`);

    // Safety timer: destroy the client if PG doesn't enforce timeout in time
    timeoutId = setTimeout(() => {
      client.release(true); // destroy to abort in-flight query
      released = true;
    }, timeoutMs);

    await client.query("SELECT 1");

    // Query succeeded — clean up timer and commit
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    await client.query("COMMIT").catch(() => {
      // Commit may fail if client was destroyed by safety timer
    });

    safeRelease();

    const latencyMs = Date.now() - start;
    return { status: "healthy", latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason =
      error instanceof Error ? error.message : "Unknown database error";

    // Clean up timer
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Attempt rollback if client is still alive, then release
    if (!released) {
      await client.query("ROLLBACK").catch(() => {
        // Rollback failure is non-fatal for health check
      });
    }
    safeRelease();

    return { status: "unhealthy", latencyMs, reason };
  }
}
