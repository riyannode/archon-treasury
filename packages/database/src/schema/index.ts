/**
 * Database schema index.
 *
 * Re-exports all business table schemas.
 * New tables are added here as they are created.
 */

// Organization (tenant root)
export { organizations } from "./organizations.js";
export type { OrganizationRow, NewOrganizationRow } from "./organizations.js";

// Users (minimal identity)
export { users } from "./users.js";
export type { UserRow, NewUserRow } from "./users.js";

// Organization Members (user ↔ organization binding)
export { organizationMembers } from "./organization-members.js";
export type {
  OrganizationMemberRow,
  NewOrganizationMemberRow,
} from "./organization-members.js";

// Treasuries (organization-owned logical asset and operation pools)
export { treasuries } from "./treasuries.js";
export type { TreasuryRow, NewTreasuryRow } from "./treasuries.js";

// Re-export drizzle-orm utilities for downstream schema packages
export { pgTable } from "drizzle-orm/pg-core";
export { uuid, timestamp, text } from "drizzle-orm/pg-core";
