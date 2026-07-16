/**
 * Organization Members table schema.
 *
 * Represents a user's membership in an organization.
 * One user may belong to multiple organizations.
 * A user may have only one membership per organization.
 *
 * Constraints enforced at database level:
 *   - id: UUID primary key, application-generated
 *   - organization_id: FK to organizations, not null
 *   - user_id: FK to users, not null
 *   - role: CHECK constraint for valid roles
 *   - status: CHECK constraint for valid statuses
 *   - unique (organization_id, user_id)
 *   - timestamps: UTC timestamptz
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_members_org_idx").on(table.organizationId),
    index("organization_members_user_idx").on(table.userId),
    index("organization_members_role_idx").on(table.role),
    index("organization_members_status_idx").on(table.status),
    check(
      "organization_members_role_check",
      sql`${table.role} IN ('owner', 'organization_admin', 'treasury_operator', 'treasury_approver', 'auditor')`,
    ),
    check(
      "organization_members_status_check",
      sql`${table.status} IN ('invited', 'active', 'suspended', 'removed')`,
    ),
  ],
);

export type OrganizationMemberRow =
  typeof organizationMembers.$inferSelect;
export type NewOrganizationMemberRow =
  typeof organizationMembers.$inferInsert;
