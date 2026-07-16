/**
 * @archon-treasury/database
 *
 * PostgreSQL database client, health checks, transaction helpers,
 * migration tooling, and repository implementations for Archon Treasury.
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

// Repository implementations
export { PgOrganizationRepository } from "./repositories/organization-repository.js";
export { PgUserRepository } from "./repositories/user-repository.js";
export { PgOrganizationMemberRepository } from "./repositories/organization-member-repository.js";
