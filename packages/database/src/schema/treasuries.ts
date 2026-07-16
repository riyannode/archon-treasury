import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const treasuries = pgTable(
  "treasuries",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "no action" }),
    name: text("name").notNull(),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    environment: text("environment", { enum: ["testnet", "mainnet"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "treasuries_name_length",
      sql`char_length(btrim(${table.name})) BETWEEN 1 AND 255`,
    ),
    check("treasuries_name_trimmed", sql`${table.name} = btrim(${table.name})`),
    check(
      "treasuries_status_check",
      sql`${table.status} IN ('active', 'suspended')`,
    ),
    check(
      "treasuries_environment_check",
      sql`${table.environment} IN ('testnet', 'mainnet')`,
    ),
    uniqueIndex("treasuries_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("treasuries_organization_idx").on(table.organizationId),
    index("treasuries_status_idx").on(table.status),
    index("treasuries_environment_idx").on(table.environment),
  ],
);

export type TreasuryRow = typeof treasuries.$inferSelect;
export type NewTreasuryRow = typeof treasuries.$inferInsert;
