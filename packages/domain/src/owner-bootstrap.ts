import type { MembershipId, OrganizationId, UserId } from "./identifiers.js";
import type { OrganizationMemberRepository } from "./organization-member-repository.js";
import {
  MembershipRole,
  MembershipStatus,
  type OrganizationMember,
} from "./organization-member.js";
import { membershipPersistenceError } from "./errors.js";

export interface CreateActiveOwnerMembershipInput {
  readonly id: MembershipId;
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
}

/**
 * Creates the active owner membership after the caller has created or resolved
 * the user and organization. Passing a transaction-scoped repository lets the
 * complete onboarding flow commit or roll back atomically.
 */
export async function createActiveOwnerMembership(
  repository: OrganizationMemberRepository,
  input: CreateActiveOwnerMembershipInput,
): Promise<OrganizationMember> {
  const member = await repository.create({
    ...input,
    role: MembershipRole.OWNER,
    status: MembershipStatus.ACTIVE,
  });

  if (
    member.role !== MembershipRole.OWNER ||
    member.status !== MembershipStatus.ACTIVE
  ) {
    throw membershipPersistenceError("owner bootstrap returned invalid state");
  }
  return member;
}
