import { getDatabase } from "./client.js";
import type { Database, DatabaseTransaction } from "./client.js";

/**
 * Execute a callback within a database transaction.
 *
 * - Commits when callback succeeds.
 * - Rolls back when callback throws.
 * - Original error is re-thrown after rollback (preserves classification).
 * - No automatic retry — caller decides retry strategy.
 * - No hidden ambiguous side effects.
 * - Transaction type carries the full schema — future business tables
 *   are available without changing the public API.
 */
export async function withTransaction<T>(
  callback: (tx: DatabaseTransaction) => Promise<T>,
  db?: Database,
): Promise<T> {
  const database = db ?? getDatabase();

  return await database.transaction(async (tx) => {
    try {
      const result = await callback(tx);
      return result;
    } catch (error) {
      // Transaction is automatically rolled back by drizzle-orm on throw
      throw error;
    }
  });
}
