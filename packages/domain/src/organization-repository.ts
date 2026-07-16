// ── Organization Repository Interface ──────────────────────────────────────
// Repository contract for Organization persistence.
//
// This interface lives in the domain package — it has NO dependency on
// Drizzle, PostgreSQL, or any database-specific library.
//
// Implementations live in infrastructure (database package).
//
// Tenant boundary: Organization IS the tenant root. Future repositories
// for treasury, wallet, membership, etc. will scope queries by organization_id.

import type { OrganizationId } from "./identifiers.js";
import type { OrganizationSlug } from "./organization-slug.js";
import type { Organization } from "./organization.js";

// ── Input types ───────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: OrganizationSlug;
}

export interface UpdateOrganizationInput {
  readonly id: OrganizationId;
  readonly name?: string;
  readonly slug?: OrganizationSlug;
  readonly status?: import("./organization.js").OrganizationStatus;
}

// ── Repository contract ───────────────────────────────────────────────────

export interface OrganizationRepository {
  /**
   * Create a new organization.
   * Throws ConflictError if slug already exists.
   * Throws ValidationError if input is invalid.
   */
  create(input: CreateOrganizationInput): Promise<Organization>;

  /**
   * Find organization by ID.
   * Returns null if not found.
   */
  findById(id: OrganizationId): Promise<Organization | null>;

  /**
   * Find organization by slug.
   * Returns null if not found.
   */
  findBySlug(slug: OrganizationSlug): Promise<Organization | null>;

  /**
   * Update organization fields.
   * Throws NotFoundError if id does not exist.
   * Throws ConflictError if slug already exists on another organization.
   */
  update(input: UpdateOrganizationInput): Promise<Organization>;
}
