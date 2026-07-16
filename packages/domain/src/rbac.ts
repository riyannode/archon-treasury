// ── RBAC Permission Model ─────────────────────────────────────────────────
// Explicit permission constants and role-to-permission mapping.
//
// Design decisions:
//   - No numeric role hierarchy
//   - Explicit immutable mapping per role
//   - Owner has every defined permission
//   - Non-active memberships receive no operational permissions
//   - RBAC only answers whether a principal is allowed to perform an action
//   - Does NOT implement proposal hash binding, approval threshold,
//     approval quorum, self-approval rules, nonce, approval TTL,
//     or proposal lifecycle.

import {
  MembershipRole,
  MembershipStatus,
  type OrganizationMember,
} from "./organization-member.js";
import { UserStatus } from "./user.js";
import { OrganizationStatus } from "./organization.js";
import {
  principalNotOperationalError,
  permissionDeniedError,
} from "./errors.js";

// ── Permission Constants ────────────────────────────────────────────────

export const Permission = {
  // Organization
  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_UPDATE: "organization.update",

  // Members
  MEMBERS_READ: "members.read",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_UPDATE: "members.update",
  MEMBERS_REMOVE: "members.remove",

  // Treasury
  TREASURY_READ: "treasury.read",
  TREASURY_CREATE: "treasury.create",
  TREASURY_UPDATE: "treasury.update",

  // Wallet
  WALLET_READ: "wallet.read",
  WALLET_MANAGE: "wallet.manage",

  // Policy
  POLICY_READ: "policy.read",
  POLICY_MANAGE: "policy.manage",

  // Route Intent
  ROUTE_INTENT_CREATE: "route_intent.create",
  ROUTE_INTENT_READ: "route_intent.read",

  // Proposal
  PROPOSAL_READ: "proposal.read",
  PROPOSAL_APPROVE: "proposal.approve",
  PROPOSAL_REJECT: "proposal.reject",

  // Execution
  EXECUTION_READ: "execution.read",

  // Audit
  AUDIT_READ: "audit.read",
  AUDIT_EXPORT: "audit.export",

  // Administration
  PROVIDER_MANAGE: "provider.manage",
  AGENT_BUDGET_MANAGE: "agent_budget.manage",
  EMERGENCY_STOP_MANAGE: "emergency_stop.manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ── Role-to-Permission Mapping ──────────────────────────────────────────
// Explicit immutable mapping. No numeric hierarchy.

const ROLE_PERMISSIONS: Record<MembershipRole, ReadonlySet<Permission>> = {
  [MembershipRole.OWNER]: new Set(Object.values(Permission)),

  [MembershipRole.ORGANIZATION_ADMIN]: new Set([
    // Organization and member management
    Permission.ORGANIZATION_READ,
    Permission.ORGANIZATION_UPDATE,
    Permission.MEMBERS_READ,
    Permission.MEMBERS_INVITE,
    Permission.MEMBERS_UPDATE,
    Permission.MEMBERS_REMOVE,
    // Treasury, wallet, and policy administration
    Permission.TREASURY_READ,
    Permission.TREASURY_CREATE,
    Permission.TREASURY_UPDATE,
    Permission.WALLET_READ,
    Permission.WALLET_MANAGE,
    Permission.POLICY_READ,
    Permission.POLICY_MANAGE,
    // Provider, agent-budget, and emergency-stop administration
    Permission.PROVIDER_MANAGE,
    Permission.AGENT_BUDGET_MANAGE,
    Permission.EMERGENCY_STOP_MANAGE,
    // Read proposal, execution, and audit
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
    // NOTE: must NOT automatically receive proposal.approve or proposal.reject
  ]),

  [MembershipRole.TREASURY_OPERATOR]: new Set([
    // Read organization, members, treasury, wallet, and policy
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    // Create/read route intents
    Permission.ROUTE_INTENT_CREATE,
    Permission.ROUTE_INTENT_READ,
    // Read proposals, executions, and audit
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
  ]),

  [MembershipRole.TREASURY_APPROVER]: new Set([
    // Read organization, members, treasury, wallet, policy, intents,
    // proposals, execution, and audit
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    Permission.ROUTE_INTENT_READ,
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
    // Proposal approval
    Permission.PROPOSAL_APPROVE,
    Permission.PROPOSAL_REJECT,
  ]),

  [MembershipRole.AUDITOR]: new Set([
    // Read-only access
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    Permission.ROUTE_INTENT_READ,
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
    // Audit export
    Permission.AUDIT_EXPORT,
  ]),
};

export interface OrganizationPermissionSubject extends OrganizationMember {
  readonly userStatus: UserStatus;
  readonly organizationStatus: OrganizationStatus;
}

// ── Pure Domain Helpers ─────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasRolePermission(
  role: MembershipRole,
  permission: Permission,
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.has(permission);
}

/**
 * Check if a membership has a specific permission.
 * Operational permission requires:
 *   - membership is active
 * (User active + organization active checked by caller)
 * Invited, suspended, and removed memberships receive no operational permission.
 */
export function hasOrganizationPermission(
  member: OrganizationPermissionSubject,
  permission: Permission,
): boolean {
  if (
    member.userStatus !== UserStatus.ACTIVE ||
    member.status !== MembershipStatus.ACTIVE ||
    member.organizationStatus !== OrganizationStatus.ACTIVE
  ) {
    return false;
  }
  return hasRolePermission(member.role, permission);
}

/**
 * Assert that a membership has a specific permission.
 * Throws DomainError if membership is not active or lacks the permission.
 */
export function assertOrganizationPermission(
  member: OrganizationPermissionSubject,
  permission: Permission,
): void {
  if (
    member.userStatus !== UserStatus.ACTIVE ||
    member.status !== MembershipStatus.ACTIVE ||
    member.organizationStatus !== OrganizationStatus.ACTIVE
  ) {
    throw principalNotOperationalError();
  }
  if (!hasRolePermission(member.role, permission)) {
    throw permissionDeniedError(permission);
  }
}

// ── Convenience Helpers ─────────────────────────────────────────────────

export function canManageMembers(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.MEMBERS_INVITE);
}

export function canManageTreasury(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.TREASURY_CREATE);
}

export function canCreateRouteIntent(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.ROUTE_INTENT_CREATE);
}

export function canApproveProposal(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.PROPOSAL_APPROVE);
}

export function canReadExecution(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.EXECUTION_READ);
}

export function canReadAudit(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.AUDIT_READ);
}

export function canManageEmergencyStop(member: OrganizationPermissionSubject): boolean {
  return hasOrganizationPermission(member, Permission.EMERGENCY_STOP_MANAGE);
}
