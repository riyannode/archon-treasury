/**
 * Database schema index.
 *
 * PR-A005 scope: foundation only.
 * No business tables (organizations, users, memberships, treasuries,
 * wallets, policies, proposals, executions, audit_events).
 *
 * Allowed:
 * - Framework migration metadata (drizzle's internal __drizzle_migrations table)
 * - Helper types
 * - Naming conventions
 *
 * This file is intentionally empty for now.
 * Business schemas will be added in subsequent PRs.
 */

// Re-export drizzle-orm utilities for downstream schema packages
export { pgTable } from "drizzle-orm/pg-core";
export { uuid, timestamp, text } from "drizzle-orm/pg-core";
