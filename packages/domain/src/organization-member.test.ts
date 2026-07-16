import { describe, expect, it } from "vitest";
import {
  MembershipId,
  MembershipRole,
  MembershipStatus,
  OrganizationId,
  OrganizationStatus,
  Permission,
  UserId,
  UserStatus,
  assertOrganizationPermission,
  canApproveProposal,
  canCreateRouteIntent,
  canManageEmergencyStop,
  canManageMembers,
  canManageTreasury,
  canReadAudit,
  canReadExecution,
  createOrganizationMember,
  hasOrganizationPermission,
  hasRolePermission,
  updateMembershipRole,
  updateMembershipStatus,
  validateMembershipRole,
  validateMembershipStatus,
  type OrganizationPermissionSubject,
} from "./index.js";

const ALL_PERMISSIONS = Object.values(Permission);
const EXPECTED: Record<MembershipRole, readonly string[]> = {
  [MembershipRole.OWNER]: ALL_PERMISSIONS,
  [MembershipRole.ORGANIZATION_ADMIN]: [
    Permission.ORGANIZATION_READ,
    Permission.ORGANIZATION_UPDATE,
    Permission.MEMBERS_READ,
    Permission.MEMBERS_INVITE,
    Permission.MEMBERS_UPDATE,
    Permission.MEMBERS_REMOVE,
    Permission.TREASURY_READ,
    Permission.TREASURY_CREATE,
    Permission.TREASURY_UPDATE,
    Permission.WALLET_READ,
    Permission.WALLET_MANAGE,
    Permission.POLICY_READ,
    Permission.POLICY_MANAGE,
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
    Permission.PROVIDER_MANAGE,
    Permission.AGENT_BUDGET_MANAGE,
    Permission.EMERGENCY_STOP_MANAGE,
  ],
  [MembershipRole.TREASURY_OPERATOR]: [
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    Permission.ROUTE_INTENT_CREATE,
    Permission.ROUTE_INTENT_READ,
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
  ],
  [MembershipRole.TREASURY_APPROVER]: [
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    Permission.ROUTE_INTENT_READ,
    Permission.PROPOSAL_READ,
    Permission.PROPOSAL_APPROVE,
    Permission.PROPOSAL_REJECT,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
  ],
  [MembershipRole.AUDITOR]: [
    Permission.ORGANIZATION_READ,
    Permission.MEMBERS_READ,
    Permission.TREASURY_READ,
    Permission.WALLET_READ,
    Permission.POLICY_READ,
    Permission.ROUTE_INTENT_READ,
    Permission.PROPOSAL_READ,
    Permission.EXECUTION_READ,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
  ],
};

function subject(
  role: MembershipRole,
  overrides: Partial<OrganizationPermissionSubject> = {},
): OrganizationPermissionSubject {
  return {
    id: MembershipId.parse("550e8400-e29b-41d4-a716-446655440000"),
    organizationId: OrganizationId.parse("550e8400-e29b-41d4-a716-446655440001"),
    userId: UserId.parse("550e8400-e29b-41d4-a716-446655440002"),
    role,
    status: MembershipStatus.ACTIVE,
    userStatus: UserStatus.ACTIVE,
    organizationStatus: OrganizationStatus.ACTIVE,
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}

describe("OrganizationMember", () => {
  it("validates exactly the initial roles and statuses without input echo", () => {
    for (const role of Object.values(MembershipRole)) {
      expect(validateMembershipRole(role)).toBe(role);
    }
    for (const status of Object.values(MembershipStatus)) {
      expect(validateMembershipStatus(status)).toBe(status);
    }
    expect(() => validateMembershipRole("hostile-role")).toThrow(
      "Invalid membership role",
    );
    expect(() => validateMembershipStatus("hostile-status")).toThrow(
      "Invalid membership status",
    );
  });

  it("creates active members and mutates immutably with deterministic no-ops", () => {
    const member = createOrganizationMember(subject(MembershipRole.AUDITOR));
    const promoted = updateMembershipRole({
      member,
      role: MembershipRole.TREASURY_APPROVER,
    });
    const suspended = updateMembershipStatus({
      member: promoted,
      status: MembershipStatus.SUSPENDED,
    });
    expect(member.status).toBe(MembershipStatus.ACTIVE);
    expect(promoted.role).toBe(MembershipRole.TREASURY_APPROVER);
    expect(suspended.status).toBe(MembershipStatus.SUSPENDED);
    expect(updateMembershipRole({ member: promoted, role: promoted.role })).toBe(
      promoted,
    );
    expect(
      updateMembershipStatus({ member: suspended, status: suspended.status }),
    ).toBe(suspended);
  });
});

describe("explicit RBAC matrix", () => {
  it.each(Object.values(MembershipRole))("maps %s exactly", (role) => {
    const expected = new Set(EXPECTED[role]);
    for (const permission of ALL_PERMISSIONS) {
      expect(hasRolePermission(role, permission)).toBe(expected.has(permission));
    }
  });

  it("enforces approval separation", () => {
    expect(
      hasRolePermission(
        MembershipRole.ORGANIZATION_ADMIN,
        Permission.PROPOSAL_APPROVE,
      ),
    ).toBe(false);
    expect(canApproveProposal(subject(MembershipRole.TREASURY_OPERATOR))).toBe(
      false,
    );
    expect(canApproveProposal(subject(MembershipRole.TREASURY_APPROVER))).toBe(
      true,
    );
    expect(
      hasRolePermission(
        MembershipRole.TREASURY_APPROVER,
        Permission.PROPOSAL_REJECT,
      ),
    ).toBe(true);
  });

  it("keeps auditor read-only except audit export", () => {
    const mutations = ALL_PERMISSIONS.filter(
      (permission) =>
        permission.endsWith(".create") ||
        permission.endsWith(".update") ||
        permission.endsWith(".manage") ||
        permission.endsWith(".approve") ||
        permission.endsWith(".reject") ||
        permission === Permission.MEMBERS_INVITE ||
        permission === Permission.MEMBERS_REMOVE,
    );
    for (const permission of mutations) {
      expect(hasRolePermission(MembershipRole.AUDITOR, permission)).toBe(false);
    }
    expect(hasRolePermission(MembershipRole.AUDITOR, Permission.AUDIT_EXPORT)).toBe(
      true,
    );
  });
});

describe("operational authorization", () => {
  it.each([
    { userStatus: UserStatus.SUSPENDED },
    { status: MembershipStatus.INVITED },
    { status: MembershipStatus.SUSPENDED },
    { status: MembershipStatus.REMOVED },
    { organizationStatus: OrganizationStatus.SUSPENDED },
  ])("denies non-operational subject: %o", (override) => {
    const member = subject(MembershipRole.OWNER, override);
    expect(hasOrganizationPermission(member, Permission.ORGANIZATION_READ)).toBe(
      false,
    );
    expect(() =>
      assertOrganizationPermission(member, Permission.ORGANIZATION_READ),
    ).toThrow("Principal is not operational");
  });

  it("asserts role permission only after all three statuses are active", () => {
    const auditor = subject(MembershipRole.AUDITOR);
    expect(() =>
      assertOrganizationPermission(auditor, Permission.AUDIT_READ),
    ).not.toThrow();
    expect(() =>
      assertOrganizationPermission(auditor, Permission.MEMBERS_INVITE),
    ).toThrow("Permission denied");
  });

  it("exposes deterministic convenience decisions", () => {
    expect(canManageMembers(subject(MembershipRole.ORGANIZATION_ADMIN))).toBe(true);
    expect(canManageTreasury(subject(MembershipRole.ORGANIZATION_ADMIN))).toBe(true);
    expect(canCreateRouteIntent(subject(MembershipRole.TREASURY_OPERATOR))).toBe(
      true,
    );
    expect(canReadExecution(subject(MembershipRole.AUDITOR))).toBe(true);
    expect(canReadAudit(subject(MembershipRole.AUDITOR))).toBe(true);
    expect(
      canManageEmergencyStop(subject(MembershipRole.ORGANIZATION_ADMIN)),
    ).toBe(true);
  });
});
