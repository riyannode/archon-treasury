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
  const id = OrganizationId.safe(row.id);
  if (id === null) throw organizationPersistenceError("invalid persisted ID");

  let name: string;
  try { name = validateOrganizationName(row.name); }
  catch { throw organizationPersistenceError("invalid persisted name"); }

  const slug = OrganizationSlug.safe(row.slug);
  if (slug === null) throw organizationPersistenceError("invalid persisted slug");

  let status: OrganizationStatus;
  try { status = validateOrganizationStatus(row.status); }
  catch { throw organizationPersistenceError("invalid persisted status"); }

  if (!(row.createdAt instanceof Date) || Number.isNaN(row.createdAt.getTime()))
    throw organizationPersistenceError("invalid persisted createdAt");
  if (!(row.updatedAt instanceof Date) || Number.isNaN(row.updatedAt.getTime()))
    throw organizationPersistenceError("invalid persisted updatedAt");

  return { id, name, slug, status, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function rowFromJson(raw: Record<string, unknown>): OrganizationRow {
  return {
    id: raw["id"] as string,
    name: raw["name"] as string,
    slug: raw["slug"] as string,
    status: raw["status"] as "active" | "suspended",
    createdAt: raw["created_at"] as Date,
    updatedAt: raw["updated_at"] as Date,
  };
}

// ── Repository ────────────────────────────────────────────────────────────

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: Database | DatabaseTransaction) {}

  async create(input: CreateOrganizationInput): Promise<Organization> {
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
      const result = await this.db.insert(organizations).values(newRow).returning();
      const row = result[0];
      if (!row) throw organizationPersistenceError("create returned no rows");
      return rowToOrganization(row);
    } catch (error: unknown) {
      if (isSlugUniqueViolation(error))
        throw organizationSlugConflictError(OrganizationSlug.serialize(input.slug));
      throw error;
    }
  }

  async findById(id: import("@archon-treasury/domain").OrganizationId): Promise<Organization | null> {
    const result = await this.db
      .select().from(organizations)
      .where(eq(organizations.id, OrganizationId.serialize(id)))
      .limit(1);
    const row = result[0];
    return row ? rowToOrganization(row) : null;
  }

  async findBySlug(slug: OrganizationSlugType): Promise<Organization | null> {
    const result = await this.db
      .select().from(organizations)
      .where(eq(organizations.slug, OrganizationSlug.serialize(slug)))
      .limit(1);
    const row = result[0];
    return row ? rowToOrganization(row) : null;
  }

  async update(input: UpdateOrganizationInput): Promise<Organization> {
    // ── Build SET and WHERE clauses using fixed column names ────────────
    const setClauses: ReturnType<typeof sql>[] = [];
    const whereConditions: ReturnType<typeof sql>[] = [];

    if (input.name !== undefined) {
      const validated = validateOrganizationName(input.name);
      setClauses.push(sql`"name" = ${validated}`);
      whereConditions.push(sql`cur."name" IS DISTINCT FROM ${validated}`);
    }

    if (input.slug !== undefined) {
      const serialized = OrganizationSlug.serialize(input.slug);
      setClauses.push(sql`"slug" = ${serialized}`);
      whereConditions.push(sql`cur."slug" IS DISTINCT FROM ${serialized}`);
    }

    if (input.status !== undefined) {
      const validated = validateOrganizationStatus(input.status);
      setClauses.push(sql`"status" = ${validated}`);
      whereConditions.push(sql`cur."status" IS DISTINCT FROM ${validated}`);
    }

    if (setClauses.length === 0) {
      throw emptyUpdateError();
    }

    const idStr = OrganizationId.serialize(input.id);

    // ── Single atomic CTE — exactly one round trip ──────────────────────
    // current_row: the existing row for outcome determination
    // do_update: conditional UPDATE only when at least one value differs
    // SELECT returns exactly one row: outcome ('updated'|'unchanged'|'not_found')
    //   and the organization as JSON (updated row if updated, current if unchanged)
    //
    // Column names ("name", "slug", "status") are hardcoded here, never from caller input.
    try {
      const result = await this.db.execute(sql`
        WITH current_row AS (
          SELECT * FROM "organizations" WHERE "id" = ${idStr}
        ),
        do_update AS (
          UPDATE "organizations"
          SET ${sql.join(setClauses, sql`, `)}, "updated_at" = NOW()
          WHERE "id" = ${idStr}
            AND (${sql.join(whereConditions, sql` OR `)})
          RETURNING *
        )
        SELECT
          CASE
            WHEN EXISTS (SELECT 1 FROM do_update) THEN 'updated'::text
            WHEN EXISTS (SELECT 1 FROM current_row) THEN 'unchanged'::text
            ELSE 'not_found'::text
          END AS outcome,
          COALESCE(
            (SELECT row_to_json(t.*) FROM do_update t),
            (SELECT row_to_json(t.*) FROM current_row t)
          ) AS organization
      `);

      const rows = result.rows as Array<{ outcome: string; organization: Record<string, unknown> }>;
      const first = rows[0];

      if (!first) throw organizationNotFoundError(idStr);

      switch (first.outcome) {
        case "updated": {
          const raw = first.organization;
          if (!raw) throw organizationPersistenceError("update returned null organization");
          return rowToOrganization(rowFromJson(raw));
        }
        case "unchanged": {
          const raw = first.organization;
          if (!raw) throw organizationPersistenceError("unchanged returned null organization");
          return rowToOrganization(rowFromJson(raw));
        }
        case "not_found":
          throw organizationNotFoundError(idStr);
        default:
          throw organizationPersistenceError(`unexpected outcome: ${first.outcome}`);
      }
    } catch (error: unknown) {
      if (isSlugUniqueViolation(error)) {
        throw organizationSlugConflictError(
          input.slug ? OrganizationSlug.serialize(input.slug) : "unknown slug",
        );
      }
      throw error;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

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
