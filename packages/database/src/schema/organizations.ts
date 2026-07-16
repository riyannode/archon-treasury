/**
 * Organizations table schema.
 *
 * Organization is the tenant root for Archon Treasury.
 * All future records (treasury, wallet, membership, policy,
 * proposals, executions, audit events) reference organization_id.
 *
 * Constraints enforced at database level:
 *   - id: UUID primary key, application-generated
 *   - name: 1–255 chars after trim (CHECK constraint)
 *   - slug: unique, 1–63 chars, lowercase format (CHECK + UNIQUE)
 *   - status: active | suspended (CHECK constraint)
 *   - timestamps: UTC timestamptz
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
    check(
      "organizations_name_length",
      sql`char_length(btrim(${table.name})) BETWEEN 1 AND 255`,
    ),
    check(
      "organizations_slug_length",
      sql`char_length(${table.slug}) BETWEEN 1 AND 63`,
    ),
    check(
      "organizations_slug_format",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "organizations_status_check",
      sql`${table.status} IN ('active', 'suspended')`,
    ),
  ],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
