// ── Organization Member Repository Interface ─────────────────────────────
// Repository contract for OrganizationMember persistence.
//
// This interface lives in the domain package — it has NO dependency on
// Drizzle, PostgreSQL, or any database-specific library.
// Implementations live in infrastructure (database package).
//
// Tenant boundary: Authorization lookups use explicit organization scope.
// listByUser is an intentional user-centric enumeration, not an authorization lookup.

import type { UserId, OrganizationId, MembershipId } from "./identifiers.js";
import type {
  OrganizationMember,
  MembershipRole,
  MembershipStatus,
} from "./organization-member.js";

// ── Input types ───────────────────────────────────────────────────────────

export interface CreateOrganizationMemberInput {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
}

export interface UpdateOrganizationMemberInput {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly role?: MembershipRole;
  readonly status?: MembershipStatus;
}

// ── Repository contract ───────────────────────────────────────────────────

export interface OrganizationMemberRepository {
  /**
   * Create a new membership.
   * Throws ConflictError if user already has a membership in the organization.
   * Throws ValidationError if input is invalid.
   */
  create(input: CreateOrganizationMemberInput): Promise<OrganizationMember>;

  /**
   * Find membership by ID scoped by organization.
   * Returns null if not found.
   */
  findById(
    id: MembershipId,
    organizationId: OrganizationId,
  ): Promise<OrganizationMember | null>;

  /**
   * Find membership by organization and user.
   * Returns null if not found.
   */
  findByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<OrganizationMember | null>;

  /**
   * List all memberships for an organization.
   */
  listByOrganization(
    organizationId: OrganizationId,
  ): Promise<readonly OrganizationMember[]>;

  /**
   * List all organizations a user belongs to.
   */
  listByUser(userId: UserId): Promise<readonly OrganizationMember[]>;

  /**
   * Update membership fields.
   * Throws NotFoundError if id does not exist.
   */
  update(input: UpdateOrganizationMemberInput): Promise<OrganizationMember>;
}
