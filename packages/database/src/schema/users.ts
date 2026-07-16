/**
 * Users table schema.
 *
 * Minimal identity entity for Archon Treasury.
 * One user may belong to multiple organizations.
 *
 * Constraints enforced at database level:
 *   - id: UUID primary key, application-generated
 *   - email: not null, normalized lowercase, length check, unique
 *   - display_name: not null, length check
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
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
    uniqueIndex("users_email_unique").on(table.email),
    check(
      "users_email_length",
      sql`char_length(${table.email}) BETWEEN 1 AND 320`,
    ),
    check(
      "users_email_lowercase",
      sql`${table.email} = lower(${table.email})`,
    ),
    check("users_email_trimmed", sql`${table.email} = btrim(${table.email})`),
    check(
      "users_display_name_length",
      sql`char_length(btrim(${table.displayName})) BETWEEN 1 AND 255`,
    ),
    check(
      "users_display_name_trimmed",
      sql`${table.displayName} = btrim(${table.displayName})`,
    ),
    check(
      "users_status_check",
      sql`${table.status} IN ('active', 'suspended')`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
