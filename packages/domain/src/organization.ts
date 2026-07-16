// ── Organization Domain Entity ─────────────────────────────────────────────
// Organization is the tenant root for Archon Treasury.
// All future records (treasury, wallet, membership, policy, proposals,
// executions, audit events) will reference organization_id.
//
// Invariant: Organization entity is immutable after creation.
// Mutation returns a new object — never mutates in place.

import type { OrganizationId } from "./identifiers.js";
import type { OrganizationSlug } from "./organization-slug.js";

// ── Status ────────────────────────────────────────────────────────────────

export const OrganizationStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

const VALID_STATUSES = new Set<string>(Object.values(OrganizationStatus));

export function isValidOrganizationStatus(status: string): boolean {
  return VALID_STATUSES.has(status);
}

// ── Entity ────────────────────────────────────────────────────────────────

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: OrganizationSlug;
  readonly status: OrganizationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Name validation ───────────────────────────────────────────────────────

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 255;

export function isValidOrganizationName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= NAME_MIN_LENGTH && trimmed.length <= NAME_MAX_LENGTH;
}

// ── Create ────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  readonly id?: OrganizationId;
  readonly name: string;
  readonly slug: OrganizationSlug;
}

export function createOrganization(
  input: CreateOrganizationInput,
  now?: Date,
): Organization {
  const trimmed = input.name.trim();
  if (!isValidOrganizationName(trimmed)) {
    throw new Error(
      `Invalid organization name: must be non-empty and at most ${NAME_MAX_LENGTH} characters after trim`,
    );
  }

  const timestamp = now ?? new Date();

  return {
    id: input.id!, // caller is responsible for generating OrganizationId
    name: trimmed,
    slug: input.slug,
    status: OrganizationStatus.ACTIVE,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ── Update operations (explicit methods) ──────────────────────────────────

export interface RenameOrganizationInput {
  readonly organization: Organization;
  readonly name: string;
}

export function renameOrganization(input: RenameOrganizationInput): Organization {
  const trimmed = input.name.trim();
  if (!isValidOrganizationName(trimmed)) {
    throw new Error(
      `Invalid organization name: must be non-empty and at most ${NAME_MAX_LENGTH} characters after trim`,
    );
  }

  return {
    ...input.organization,
    name: trimmed,
    updatedAt: new Date(),
  };
}

export interface ChangeSlugInput {
  readonly organization: Organization;
  readonly slug: OrganizationSlug;
}

export function changeOrganizationSlug(input: ChangeSlugInput): Organization {
  return {
    ...input.organization,
    slug: input.slug,
    updatedAt: new Date(),
  };
}

export function suspendOrganization(organization: Organization): Organization {
  if (organization.status === OrganizationStatus.SUSPENDED) {
    return organization; // already suspended — deterministic no-op
  }
  return {
    ...organization,
    status: OrganizationStatus.SUSPENDED,
    updatedAt: new Date(),
  };
}

export function activateOrganization(organization: Organization): Organization {
  if (organization.status === OrganizationStatus.ACTIVE) {
    return { ...organization, updatedAt: new Date() }; // already active — still update timestamp
  }
  return {
    ...organization,
    status: OrganizationStatus.ACTIVE,
    updatedAt: new Date(),
  };
}
