/**
 * Database schema index.
 *
 * Re-exports all business table schemas.
 * New tables are added here as they are created.
 */

// Organization (tenant root)
export { organizations } from "./organizations.js";
export type { OrganizationRow, NewOrganizationRow } from "./organizations.js";

// Re-export drizzle-orm utilities for downstream schema packages
export { pgTable } from "drizzle-orm/pg-core";
export { uuid, timestamp, text } from "drizzle-orm/pg-core";
