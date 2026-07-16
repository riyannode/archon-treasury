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

import { eq } from "drizzle-orm";
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
      `invalid persisted ID: "${row.id}"`,
    );
  }

  // Validate name
  let name: string;
  try {
    name = validateOrganizationName(row.name);
  } catch {
    throw organizationPersistenceError(
      `invalid persisted name: "${row.name}"`,
    );
  }

  // Validate slug
  const slug = OrganizationSlug.safe(row.slug);
  if (slug === null) {
    throw organizationPersistenceError(
      `invalid persisted slug: "${row.slug}"`,
    );
  }

  // Validate status
  let status: OrganizationStatus;
  try {
    status = validateOrganizationStatus(row.status);
  } catch {
    throw organizationPersistenceError(
      `invalid persisted status: "${row.status}"`,
    );
  }

  // Validate timestamps
  if (!(row.createdAt instanceof Date) || Number.isNaN(row.createdAt.getTime())) {
    throw organizationPersistenceError(
      `invalid persisted createdAt: ${String(row.createdAt)}`,
    );
  }
  if (!(row.updatedAt instanceof Date) || Number.isNaN(row.updatedAt.getTime())) {
    throw organizationPersistenceError(
      `invalid persisted updatedAt: ${String(row.updatedAt)}`,
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
        throw new Error("Organization create returned no rows");
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
    let hasChanges = false;

    if (input.name !== undefined) {
      const trimmedName = validateOrganizationName(input.name);
      updates["name"] = trimmedName;
      hasChanges = true;
    }

    if (input.slug !== undefined) {
      updates["slug"] = OrganizationSlug.serialize(input.slug);
      hasChanges = true;
    }

    if (input.status !== undefined) {
      const validStatus = validateOrganizationStatus(input.status);
      updates["status"] = validStatus;
      hasChanges = true;
    }

    // Reject empty update
    if (!hasChanges) {
      throw emptyUpdateError();
    }

    // Only update updatedAt when there are actual field changes
    updates["updatedAt"] = new Date();

    try {
      // Single UPDATE ... WHERE id = ... RETURNING
      const result = await this.db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, OrganizationId.serialize(input.id)))
        .returning();

      const row = result[0];
      if (!row) {
        throw organizationNotFoundError(OrganizationId.serialize(input.id));
      }

      return rowToOrganization(row);
    } catch (error: unknown) {
      // Map PostgreSQL unique violation (23505) ONLY for the slug constraint
      if (isSlugUniqueViolation(error)) {
        throw organizationSlugConflictError(
          input.slug
            ? OrganizationSlug.serialize(input.slug)
            : "unknown slug",
        );
      }
      throw error;
    }
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
    // Check constraint name if available (pg driver exposes it)
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
