/**
 * PostgreSQL organization repository implementation.
 *
 * Implements OrganizationRepository from the domain package.
 * All queries are parameterized. No SQL string interpolation.
 * Maps database rows to domain entities explicitly.
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
} from "@archon-treasury/domain";

// ── Row → Domain mapping ──────────────────────────────────────────────────

function rowToOrganization(row: OrganizationRow): Organization {
  return {
    id: OrganizationId.parse(row.id),
    name: row.name,
    slug: OrganizationSlug.parse(row.slug),
    status: row.status as import("@archon-treasury/domain").OrganizationStatus,
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
    const now = new Date();

    const newRow = {
      id: OrganizationId.serialize(input.id),
      name: input.name.trim(),
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
      // Map PostgreSQL unique violation (23505) to domain ConflictError
      if (isUniqueViolation(error)) {
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
    // First verify the organization exists
    const existing = await this.findById(input.id);
    if (!existing) {
      throw organizationNotFoundError(OrganizationId.serialize(input.id));
    }

    // Build update payload — only defined fields
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updates["name"] = input.name.trim();
    }

    if (input.slug !== undefined) {
      updates["slug"] = OrganizationSlug.serialize(input.slug);
    }

    if (input.status !== undefined) {
      updates["status"] = input.status;
    }

    try {
      const result = await this.db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, OrganizationId.serialize(input.id)))
        .returning();

      const row = result[0];
      if (!row) {
        // Should not happen since we checked existence above
        throw organizationNotFoundError(OrganizationId.serialize(input.id));
      }

      return rowToOrganization(row);
    } catch (error: unknown) {
      // Map PostgreSQL unique violation (23505) to domain ConflictError
      if (isUniqueViolation(error)) {
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

function isUniqueViolation(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  ) {
    return true;
  }
  return false;
}
