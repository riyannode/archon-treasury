import { and, eq, sql } from "drizzle-orm";
import type { Database, DatabaseTransaction } from "../client.js";
import {
  organizationMembers,
  type OrganizationMemberRow,
} from "../schema/organization-members.js";
import type {
  CreateOrganizationMemberInput,
  MembershipRole,
  MembershipStatus,
  OrganizationMember,
  OrganizationMemberRepository,
  UpdateOrganizationMemberInput,
} from "@archon-treasury/domain";
import {
  DomainError,
  MembershipId,
  OrganizationId,
  UserId,
  emptyUpdateError,
  membershipConflictError,
  membershipNotFoundError,
  membershipPersistenceError,
  validateMembershipRole,
  validateMembershipStatus,
} from "@archon-treasury/domain";

function rowToMember(row: OrganizationMemberRow): OrganizationMember {
  const id = MembershipId.safe(row.id);
  const organizationId = OrganizationId.safe(row.organizationId);
  const userId = UserId.safe(row.userId);
  if (id === null) throw membershipPersistenceError("invalid persisted ID");
  if (organizationId === null) {
    throw membershipPersistenceError("invalid persisted organizationId");
  }
  if (userId === null) throw membershipPersistenceError("invalid persisted userId");

  let role: MembershipRole;
  let status: MembershipStatus;
  try {
    role = validateMembershipRole(row.role);
    status = validateMembershipStatus(row.status);
  } catch {
    throw membershipPersistenceError("invalid persisted role or status");
  }
  if (!(row.createdAt instanceof Date) || Number.isNaN(row.createdAt.getTime())) {
    throw membershipPersistenceError("invalid persisted createdAt");
  }
  if (!(row.updatedAt instanceof Date) || Number.isNaN(row.updatedAt.getTime())) {
    throw membershipPersistenceError("invalid persisted updatedAt");
  }
  return { id, organizationId, userId, role, status, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function postgresError(error: unknown, depth = 0): { code?: string; constraint?: string } | null {
  if (depth > 3 || typeof error !== "object" || error === null) return null;
  const candidate = error as { code?: unknown; constraint?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") {
    return {
      code: candidate.code,
      constraint:
        typeof candidate.constraint === "string" ? candidate.constraint : undefined,
    };
  }
  return postgresError(candidate.cause, depth + 1);
}

function mapDatabaseError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  const pgError = postgresError(error);
  if (
    pgError?.code === "23505" &&
    pgError.constraint === "organization_members_org_user_unique"
  ) {
    return membershipConflictError();
  }
  return membershipPersistenceError("database operation failed");
}

export class PgOrganizationMemberRepository
  implements OrganizationMemberRepository
{
  constructor(private readonly db: Database | DatabaseTransaction) {}

  async create(input: CreateOrganizationMemberInput): Promise<OrganizationMember> {
    const role = validateMembershipRole(input.role);
    const status = validateMembershipStatus(input.status);
    const now = new Date();
    try {
      const [row] = await this.db
        .insert(organizationMembers)
        .values({
          id: MembershipId.serialize(input.id),
          organizationId: OrganizationId.serialize(input.organizationId),
          userId: UserId.serialize(input.userId),
          role,
          status,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!row) throw membershipPersistenceError("create returned no rows");
      return rowToMember(row);
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async findById(
    id: import("@archon-treasury/domain").MembershipId,
    organizationId: import("@archon-treasury/domain").OrganizationId,
  ): Promise<OrganizationMember | null> {
    try {
      const [row] = await this.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.id, MembershipId.serialize(id)),
            eq(
              organizationMembers.organizationId,
              OrganizationId.serialize(organizationId),
            ),
          ),
        )
        .limit(1);
      return row ? rowToMember(row) : null;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async findByOrganizationAndUser(
    organizationId: import("@archon-treasury/domain").OrganizationId,
    userId: import("@archon-treasury/domain").UserId,
  ): Promise<OrganizationMember | null> {
    try {
      const [row] = await this.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(
              organizationMembers.organizationId,
              OrganizationId.serialize(organizationId),
            ),
            eq(organizationMembers.userId, UserId.serialize(userId)),
          ),
        )
        .limit(1);
      return row ? rowToMember(row) : null;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async listByOrganization(
    organizationId: import("@archon-treasury/domain").OrganizationId,
  ): Promise<readonly OrganizationMember[]> {
    try {
      const rows = await this.db
        .select()
        .from(organizationMembers)
        .where(
          eq(
            organizationMembers.organizationId,
            OrganizationId.serialize(organizationId),
          ),
        );
      return rows.map(rowToMember);
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async listByUser(
    userId: import("@archon-treasury/domain").UserId,
  ): Promise<readonly OrganizationMember[]> {
    try {
      const rows = await this.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, UserId.serialize(userId)));
      return rows.map(rowToMember);
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async update(input: UpdateOrganizationMemberInput): Promise<OrganizationMember> {
    const sets: ReturnType<typeof sql>[] = [];
    const changes: ReturnType<typeof sql>[] = [];
    if (input.role !== undefined) {
      const role = validateMembershipRole(input.role);
      sets.push(sql`"role" = ${role}`);
      changes.push(sql`cur."role" IS DISTINCT FROM ${role}`);
    }
    if (input.status !== undefined) {
      const status = validateMembershipStatus(input.status);
      sets.push(sql`"status" = ${status}`);
      changes.push(sql`cur."status" IS DISTINCT FROM ${status}`);
    }
    if (sets.length === 0) throw emptyUpdateError();

    const id = MembershipId.serialize(input.id);
    const organizationId = OrganizationId.serialize(input.organizationId);
    try {
      const result = await this.db.execute(sql`
        WITH current_row AS (
          SELECT * FROM "organization_members"
          WHERE "id" = ${id} AND "organization_id" = ${organizationId}
        ), updated_row AS (
          UPDATE "organization_members"
          SET ${sql.join(sets, sql`, `)}, "updated_at" = NOW()
          WHERE "id" = ${id}
            AND "organization_id" = ${organizationId}
            AND (${sql.join(changes, sql` OR `)})
          RETURNING *
        )
        SELECT
          CASE WHEN u."id" IS NOT NULL THEN 'updated'
               WHEN c."id" IS NOT NULL THEN 'unchanged'
               ELSE 'not_found' END AS outcome,
          COALESCE(u."id", c."id") AS id,
          COALESCE(u."organization_id", c."organization_id") AS organization_id,
          COALESCE(u."user_id", c."user_id") AS user_id,
          COALESCE(u."role", c."role") AS role,
          COALESCE(u."status", c."status") AS status,
          COALESCE(u."created_at", c."created_at") AS created_at,
          COALESCE(u."updated_at", c."updated_at") AS updated_at
        FROM (SELECT 1) seed
        LEFT JOIN updated_row u ON true
        LEFT JOIN current_row c ON true
      `);
      const resultRow = result.rows[0] as Record<string, unknown> | undefined;
      if (!resultRow || resultRow["outcome"] === "not_found") {
        throw membershipNotFoundError();
      }
      return rowToMember({
        id: resultRow["id"] as string,
        organizationId: resultRow["organization_id"] as string,
        userId: resultRow["user_id"] as string,
        role: resultRow["role"] as string,
        status: resultRow["status"] as string,
        createdAt: resultRow["created_at"] as Date,
        updatedAt: resultRow["updated_at"] as Date,
      });
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }
}
