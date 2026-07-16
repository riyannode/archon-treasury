/**
 * PostgreSQL organization repository implementation.
 *
 * Implements OrganizationRepository from the domain package.
 * All queries are parameterized. No SQL string interpolation.
 * Maps database rows to domain entities explicitly with validation.
 * Maps domain inputs to persistence format explicitly.
 *
 * Tenant boundary: Organization IS the tenant root.
 * This repository operates on the organizations table only.
 */

import { eq, sql } from "drizzle-orm";
import type { Database, DatabaseTransaction } from "../client.js";
import { organizations } from "../schema/organizations.js";
import type { OrganizationRow } from "../schema/organizations.js";

import type {
  OrganizationRepository,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@archon-treasury/domain";
import {
  OrganizationId,
  OrganizationSlug,
  type Organization,
  type OrganizationSlug as OrganizationSlugType,
  OrganizationStatus,
  organizationNotFoundError,
  organizationSlugConflictError,
  validateOrganizationName,
  validateOrganizationStatus,
  emptyUpdateError,
  organizationPersistenceError,
} from "@archon-treasury/domain";

// ── Row → Domain mapping (with validation) ────────────────────────────────

function rowToOrganization(row: OrganizationRow): Organization {
  // Validate ID
  const id = OrganizationId.safe(row.id);
  if (id === null) {
    throw organizationPersistenceError(
      `invalid persisted ID`,
    );
  }

  // Validate name
  let name: string;
  try {
    name = validateOrganizationName(row.name);
  } catch {
    throw organizationPersistenceError(
      `invalid persisted name`,
    );
  }

  // Validate slug
  const slug = OrganizationSlug.safe(row.slug);
  if (slug === null) {
    throw organizationPersistenceError(
      `invalid persisted slug`,
    );
  }

  // Validate status
  let status: OrganizationStatus;
  try {
    status = validateOrganizationStatus(row.status);
  } catch {
    throw organizationPersistenceError(
      `invalid persisted status`,
    );
  }

  // Validate timestamps
  if (!(row.createdAt instanceof Date) || Number.isNaN(row.createdAt.getTime())) {
    throw organizationPersistenceError(
      `invalid persisted createdAt`,
    );
  }
  if (!(row.updatedAt instanceof Date) || Number.isNaN(row.updatedAt.getTime())) {
    throw organizationPersistenceError(
      `invalid persisted updatedAt`,
    );
  }

  return {
    id,
    name,
    slug,
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Repository ────────────────────────────────────────────────────────────

export class PgOrganizationRepository implements OrganizationRepository {
  /**
   * Accept a typed database or transaction handle.
   * The caller controls the transaction boundary.
   */
  constructor(private readonly db: Database | DatabaseTransaction) {}

  async create(input: CreateOrganizationInput): Promise<Organization> {
    // Validate before query
    const trimmedName = validateOrganizationName(input.name);

    const now = new Date();
    const newRow = {
      id: OrganizationId.serialize(input.id),
      name: trimmedName,
      slug: OrganizationSlug.serialize(input.slug),
      status: OrganizationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.db
        .insert(organizations)
        .values(newRow)
        .returning();

      const row = result[0];
      if (!row) {
        throw organizationPersistenceError("create returned no rows");
      }

      return rowToOrganization(row);
    } catch (error: unknown) {
      // Map PostgreSQL unique violation (23505) ONLY for the slug constraint
      if (isSlugUniqueViolation(error)) {
        throw organizationSlugConflictError(
          OrganizationSlug.serialize(input.slug),
        );
      }
      throw error;
    }
  }

  async findById(
    id: import("@archon-treasury/domain").OrganizationId,
  ): Promise<Organization | null> {
    const result = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, OrganizationId.serialize(id)))
      .limit(1);

    const row = result[0];
    return row ? rowToOrganization(row) : null;
  }

  async findBySlug(slug: OrganizationSlugType): Promise<Organization | null> {
    const result = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, OrganizationSlug.serialize(slug)))
      .limit(1);

    const row = result[0];
    return row ? rowToOrganization(row) : null;
  }

  async update(input: UpdateOrganizationInput): Promise<Organization> {
    // Build update payload — only defined fields
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updates["name"] = validateOrganizationName(input.name);
    }

    if (input.slug !== undefined) {
      updates["slug"] = OrganizationSlug.serialize(input.slug);
    }

    if (input.status !== undefined) {
      updates["status"] = validateOrganizationStatus(input.status);
    }

    // Reject empty update
    if (Object.keys(updates).length === 0) {
      throw emptyUpdateError();
    }

    // CTE: fetch current row, compare values, only update if something changed.
    // This is atomic — no check-then-update race.
    const idStr = OrganizationId.serialize(input.id);
    const now = new Date();

    // Build the SET clause dynamically using Drizzle's SQL template
    const setClauses: ReturnType<typeof sql>[] = [];
    const whereConditions: ReturnType<typeof sql>[] = [];

    for (const [col, val] of Object.entries(updates)) {
      const colRef = sql.identifier(col);
      setClauses.push(sql`${colRef} = ${val}`);
      // WHERE: current value differs from new value
      whereConditions.push(sql`${colRef} IS DISTINCT FROM ${val}`);
    }

    if (setClauses.length === 0) {
      throw emptyUpdateError();
    }

    // Single atomic query: UPDATE with conditional WHERE
    // If no row has changed values, RETURNING is empty → not found or no-op
    const result = await this.db.execute(sql`
      WITH current_row AS (
        SELECT id, ${sql.join(
          Object.keys(updates).map((col) => sql`${sql.identifier(col)} AS ${sql.identifier(`cur_${col}`)}`),
          sql`, `,
        )}
        FROM ${organizations}
        WHERE id = ${idStr}
      ),
      do_update AS (
        UPDATE organizations
        SET ${sql.join(setClauses, sql`, `)}, updated_at = ${now}
        WHERE id = ${idStr}
          AND (${sql.join(whereConditions, sql` OR `)})
        RETURNING *
      )
      SELECT * FROM do_update
    `);

    const rows = result.rows as OrganizationRow[];
    const row = rows[0];

    if (!row) {
      // Either the row doesn't exist, or all values are the same.
      // Check if the row exists at all.
      const existing = await this.findById(input.id);
      if (!existing) {
        throw organizationNotFoundError(idStr);
      }
      // All values same → deterministic no-op, return existing
      return existing;
    }

    return rowToOrganization(row);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Check if a PostgreSQL error is a unique violation on the slug constraint.
 * Checks the constraint name to avoid mapping unrelated unique violations
 * (e.g., PK collision) to slug conflict.
 */
function isSlugUniqueViolation(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  ) {
    const detail = (error as { detail?: string }).detail ?? "";
    const constraint = (error as { constraint?: string }).constraint ?? "";
    if (
      constraint === "organizations_slug_unique" ||
      detail.includes("organizations_slug_unique")
    ) {
      return true;
    }
  }
  return false;
}
