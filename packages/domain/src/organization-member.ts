// ── OrganizationMember Domain Entity ──────────────────────────────────────
// OrganizationMember represents a user's membership in an organization.
// One user may belong to multiple organizations.
// A user may have only one membership per organization.
//
// Invariant: Membership entity is immutable after creation.
// Mutation returns a new object — never mutates in place.

import type { UserId, OrganizationId, MembershipId } from "./identifiers.js";
import {
  invalidMembershipRoleError,
  invalidMembershipStatusError,
} from "./errors.js";

// ── Role ────────────────────────────────────────────────────────────────
// Initial roles per PRD. No numeric hierarchy.
// Explicit role-to-permission mapping lives in rbac.ts.

export const MembershipRole = {
  OWNER: "owner",
  ORGANIZATION_ADMIN: "organization_admin",
  TREASURY_OPERATOR: "treasury_operator",
  TREASURY_APPROVER: "treasury_approver",
  AUDITOR: "auditor",
} as const;

export type MembershipRole =
  (typeof MembershipRole)[keyof typeof MembershipRole];

const VALID_ROLES = new Set<string>(Object.values(MembershipRole));

export function isValidMembershipRole(role: string): boolean {
  return VALID_ROLES.has(role);
}

export function validateMembershipRole(role: string): MembershipRole {
  if (!isValidMembershipRole(role)) {
    throw invalidMembershipRoleError();
  }
  return role as MembershipRole;
}

// ── Status ────────────────────────────────────────────────────────────────

export const MembershipStatus = {
  INVITED: "invited",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REMOVED: "removed",
} as const;

export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

const VALID_STATUSES = new Set<string>(Object.values(MembershipStatus));

export function isValidMembershipStatus(status: string): boolean {
  return VALID_STATUSES.has(status);
}

export function validateMembershipStatus(status: string): MembershipStatus {
  if (!isValidMembershipStatus(status)) {
    throw invalidMembershipStatusError();
  }
  return status as MembershipStatus;
}

// ── Entity ────────────────────────────────────────────────────────────────

export interface OrganizationMember {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Create ────────────────────────────────────────────────────────────────

export interface CreateOrganizationMemberInput {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
}

export function createOrganizationMember(
  input: CreateOrganizationMemberInput,
  now?: Date,
): OrganizationMember {
  const role = validateMembershipRole(input.role);
  const status = validateMembershipStatus(input.status);
  const timestamp = now ?? new Date();

  return {
    id: input.id,
    organizationId: input.organizationId,
    userId: input.userId,
    role,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ── Update operations (explicit methods) ──────────────────────────────────

export interface UpdateMembershipRoleInput {
  readonly member: OrganizationMember;
  readonly role: MembershipRole;
}

export function updateMembershipRole(
  input: UpdateMembershipRoleInput,
): OrganizationMember {
  const role = validateMembershipRole(input.role);

  // Same role → deterministic no-op
  if (input.member.role === role) {
    return input.member;
  }

  return {
    ...input.member,
    role,
    updatedAt: new Date(),
  };
}

export interface UpdateMembershipStatusInput {
  readonly member: OrganizationMember;
  readonly status: MembershipStatus;
}

export function updateMembershipStatus(
  input: UpdateMembershipStatusInput,
): OrganizationMember {
  const status = validateMembershipStatus(input.status);

  // Same status → deterministic no-op
  if (input.member.status === status) {
    return input.member;
  }

  return {
    ...input.member,
    status,
    updatedAt: new Date(),
  };
}
