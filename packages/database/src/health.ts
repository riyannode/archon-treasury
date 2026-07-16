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
 * Returns structured result without exposing credentials or raw driver objects.
 * Never returns fake "healthy" when the query fails.
 */
export async function checkDatabaseHealth(
  timeoutMs = 5_000,
): Promise<DatabaseHealth> {
  const start = Date.now();
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      await client.query("SELECT 1");
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      return { status: "healthy", latencyMs };
    } finally {
      client.release();
    }
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason =
      error instanceof Error ? error.message : "Unknown database error";
    return { status: "unhealthy", latencyMs, reason };
  }
}
