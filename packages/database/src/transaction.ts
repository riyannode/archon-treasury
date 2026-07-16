import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDatabase } from "./client.js";

/**
 * Execute a callback within a database transaction.
 *
 * - Commits when callback succeeds.
 * - Rolls back when callback throws.
 * - Original error is re-thrown after rollback (preserves classification).
 * - No automatic retry — caller decides retry strategy.
 * - No hidden ambiguous side effects.
 */
export async function withTransaction<T>(
  callback: (tx: NodePgDatabase<Record<string, never>>) => Promise<T>,
  db?: NodePgDatabase<Record<string, never>>,
): Promise<T> {
  const database = db ?? getDatabase();

  return await database.transaction(async (tx) => {
    try {
      const result = await callback(tx as NodePgDatabase<Record<string, never>>);
      return result;
    } catch (error) {
      // Transaction is automatically rolled back by drizzle-orm on throw
      throw error;
    }
  });
}
