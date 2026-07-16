import { eq, sql } from "drizzle-orm";
import type { Database, DatabaseTransaction } from "../client.js";
import { users, type UserRow } from "../schema/users.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserEmailValue,
  UserRepository,
  UserStatus,
} from "@archon-treasury/domain";
import {
  DomainError,
  UserEmail,
  UserId,
  UserStatus as UserStatuses,
  emptyUpdateError,
  userEmailConflictError,
  userNotFoundError,
  userPersistenceError,
  validateUserDisplayName,
  validateUserStatus,
} from "@archon-treasury/domain";

function rowToUser(row: UserRow): User {
  const id = UserId.safe(row.id);
  const email = UserEmail.safe(row.email);
  if (id === null) throw userPersistenceError("invalid persisted ID");
  if (email === null) throw userPersistenceError("invalid persisted email");

  let displayName: string;
  let status: UserStatus;
  try {
    displayName = validateUserDisplayName(row.displayName);
    status = validateUserStatus(row.status);
  } catch {
    throw userPersistenceError("invalid persisted user fields");
  }
  if (displayName !== row.displayName) {
    throw userPersistenceError("invalid persisted display name");
  }
  if (!(row.createdAt instanceof Date) || Number.isNaN(row.createdAt.getTime())) {
    throw userPersistenceError("invalid persisted createdAt");
  }
  if (!(row.updatedAt instanceof Date) || Number.isNaN(row.updatedAt.getTime())) {
    throw userPersistenceError("invalid persisted updatedAt");
  }
  return { id, email, displayName, status, createdAt: row.createdAt, updatedAt: row.updatedAt };
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
  if (pgError?.code === "23505" && pgError.constraint === "users_email_unique") {
    return userEmailConflictError();
  }
  return userPersistenceError("database operation failed");
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: Database | DatabaseTransaction) {}

  async create(input: CreateUserInput): Promise<User> {
    const email = UserEmail.parse(input.email);
    const displayName = validateUserDisplayName(input.displayName);
    const now = new Date();
    try {
      const [row] = await this.db
        .insert(users)
        .values({
          id: UserId.serialize(input.id),
          email: UserEmail.serialize(email),
          displayName,
          status: UserStatuses.ACTIVE,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!row) throw userPersistenceError("create returned no rows");
      return rowToUser(row);
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async findById(id: import("@archon-treasury/domain").UserId): Promise<User | null> {
    try {
      const [row] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, UserId.serialize(id)))
        .limit(1);
      return row ? rowToUser(row) : null;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async findByEmail(email: UserEmailValue): Promise<User | null> {
    try {
      const [row] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, UserEmail.serialize(email)))
        .limit(1);
      return row ? rowToUser(row) : null;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async update(input: UpdateUserInput): Promise<User> {
    const sets: ReturnType<typeof sql>[] = [];
    const changes: ReturnType<typeof sql>[] = [];

    if (input.email !== undefined) {
      const email = UserEmail.serialize(UserEmail.parse(input.email));
      sets.push(sql`"email" = ${email}`);
      changes.push(sql`cur."email" IS DISTINCT FROM ${email}`);
    }
    if (input.displayName !== undefined) {
      const displayName = validateUserDisplayName(input.displayName);
      sets.push(sql`"display_name" = ${displayName}`);
      changes.push(sql`cur."display_name" IS DISTINCT FROM ${displayName}`);
    }
    if (input.status !== undefined) {
      const status = validateUserStatus(input.status);
      sets.push(sql`"status" = ${status}`);
      changes.push(sql`cur."status" IS DISTINCT FROM ${status}`);
    }
    if (sets.length === 0) throw emptyUpdateError();

    const id = UserId.serialize(input.id);
    try {
      const result = await this.db.execute(sql`
        WITH current_row AS MATERIALIZED (
          SELECT * FROM "users" WHERE "id" = ${id}
          FOR UPDATE
        ), updated_row AS (
          UPDATE "users" AS user_record
          SET ${sql.join(sets, sql`, `)}, "updated_at" = NOW()
          FROM current_row AS cur
          WHERE user_record."id" = cur."id"
            AND (${sql.join(changes, sql` OR `)})
          RETURNING user_record.*
        )
        SELECT
          CASE WHEN u."id" IS NOT NULL THEN 'updated'
               WHEN c."id" IS NOT NULL THEN 'unchanged'
               ELSE 'not_found' END AS outcome,
          COALESCE(u."id", c."id") AS id,
          COALESCE(u."email", c."email") AS email,
          COALESCE(u."display_name", c."display_name") AS display_name,
          COALESCE(u."status", c."status") AS status,
          COALESCE(u."created_at", c."created_at") AS created_at,
          COALESCE(u."updated_at", c."updated_at") AS updated_at
        FROM (SELECT 1) seed
        LEFT JOIN updated_row u ON true
        LEFT JOIN current_row c ON true
      `);
      const resultRow = result.rows[0] as Record<string, unknown> | undefined;
      if (!resultRow || resultRow["outcome"] === "not_found") {
        throw userNotFoundError();
      }
      return rowToUser({
        id: resultRow["id"] as string,
        email: resultRow["email"] as string,
        displayName: resultRow["display_name"] as string,
        status: resultRow["status"] as "active" | "suspended",
        createdAt: queryTimestamp(resultRow["created_at"], "createdAt"),
        updatedAt: queryTimestamp(resultRow["updated_at"], "updatedAt"),
      });
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }
}

function queryTimestamp(value: unknown, field: "createdAt" | "updatedAt"): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  throw userPersistenceError(`invalid persisted ${field}`);
}
