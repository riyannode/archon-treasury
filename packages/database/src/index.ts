/**
 * @archon-treasury/database
 *
 * PostgreSQL database client, health checks, transaction helpers,
 * and migration tooling for Archon Treasury.
 */

// Configuration
export { buildDatabaseConfig, databaseConfigSchema } from "./config.js";
export type { DatabaseConfig, SslMode } from "./config.js";

// Client lifecycle + types
export {
  connectDatabase,
  getDatabase,
  getPool,
  closeDatabase,
} from "./client.js";
export type { Database, DatabaseTransaction } from "./client.js";

// Health check
export { checkDatabaseHealth } from "./health.js";
export type { DatabaseHealth } from "./health.js";

// Transaction helper
export { withTransaction } from "./transaction.js";

// Schema re-exports
export * from "./schema/index.js";
