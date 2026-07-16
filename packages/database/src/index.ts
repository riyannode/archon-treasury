/**
 * @archon-treasury/database
 *
 * PostgreSQL database client, health checks, transaction helpers,
 * and migration tooling for Archon Treasury.
 */

// Configuration
export { buildDatabaseConfig, databaseConfigSchema } from "./config.js";
export type { DatabaseConfig } from "./config.js";

// Client lifecycle
export { connectDatabase, getDatabase, getPool, closeDatabase } from "./client.js";

// Health check
export { checkDatabaseHealth } from "./health.js";
export type { DatabaseHealth } from "./health.js";

// Transaction helper
export { withTransaction } from "./transaction.js";

// Schema re-exports
export * from "./schema/index.js";
