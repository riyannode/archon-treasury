import { and, asc, eq, sql } from "drizzle-orm";
import {
  DomainError,
  OrganizationId,
  TreasuryEnvironment,
  TreasuryId,
  TreasuryStatus,
  emptyTreasuryUpdateError,
  treasuryConflictError,
  treasuryNotFoundError,
  treasuryPersistenceError,
  validateTreasuryEnvironment,
  validateTreasuryName,
  validateTreasuryStatus,
  validateTreasuryTimestamp,
  type CreateTreasuryInput,
  type OrganizationId as OrganizationIdValue,
  type Treasury,
  type TreasuryId as TreasuryIdValue,
  type TreasuryRepository,
  type UpdateTreasuryInput,
} from "@archon-treasury/domain";
import type { Database, DatabaseTransaction } from "../client.js";
import { treasuries, type TreasuryRow } from "../schema/treasuries.js";

function rowToTreasury(row: TreasuryRow): Treasury {
  const id = TreasuryId.safe(row.id);
  if (id === null) throw treasuryPersistenceError("invalid persisted ID");

  const organizationId = OrganizationId.safe(row.organizationId);
  if (organizationId === null) {
    throw treasuryPersistenceError("invalid persisted organization ID");
  }

  let name: string;
  try {
    name = validateTreasuryName(row.name);
  } catch {
    throw treasuryPersistenceError("invalid persisted name");
  }
  if (name !== row.name) {
    throw treasuryPersistenceError("invalid persisted name");
  }

  let status: TreasuryStatus;
  try {
    status = validateTreasuryStatus(row.status);
  } catch {
    throw treasuryPersistenceError("invalid persisted status");
  }

  let environment: TreasuryEnvironment;
  try {
    environment = validateTreasuryEnvironment(row.environment);
  } catch {
    throw treasuryPersistenceError("invalid persisted environment");
  }

  const createdAt = validateTreasuryTimestamp(row.createdAt, "createdAt");
  const updatedAt = validateTreasuryTimestamp(row.updatedAt, "updatedAt");

  return Object.freeze({
    id,
    organizationId,
    name,
    status,
    environment,
    createdAt,
    updatedAt,
  });
}

export class PgTreasuryRepository implements TreasuryRepository {
  constructor(private readonly db: Database | DatabaseTransaction) {}

  async create(input: CreateTreasuryInput): Promise<Treasury> {
    const name = validateTreasuryName(input.name);
    const environment = validateTreasuryEnvironment(input.environment);
    const id = TreasuryId.serialize(input.id);
    const organizationId = OrganizationId.serialize(input.organizationId);
    const now = new Date();

    try {
      const rows = await this.db
        .insert(treasuries)
        .values({
          id,
          organizationId,
          name,
          status: TreasuryStatus.ACTIVE,
          environment,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const row = rows[0];
      if (!row) throw treasuryPersistenceError("create returned no rows");
      return rowToTreasury(row);
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async findById(
    organizationId: OrganizationIdValue,
    treasuryId: TreasuryIdValue,
  ): Promise<Treasury | null> {
    try {
      const rows = await this.db
        .select()
        .from(treasuries)
        .where(
          and(
            eq(treasuries.organizationId, OrganizationId.serialize(organizationId)),
            eq(treasuries.id, TreasuryId.serialize(treasuryId)),
          ),
        )
        .limit(1);
      return rows[0] ? rowToTreasury(rows[0]) : null;
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async listByOrganization(
    organizationId: OrganizationIdValue,
  ): Promise<readonly Treasury[]> {
    try {
      const rows = await this.db
        .select()
        .from(treasuries)
        .where(eq(treasuries.organizationId, OrganizationId.serialize(organizationId)))
        .orderBy(asc(treasuries.createdAt), asc(treasuries.id));
      return Object.freeze(rows.map(rowToTreasury));
    } catch (error) {
      throw mapDatabaseError(error);
    }
  }

  async update(input: UpdateTreasuryInput): Promise<Treasury> {
    const setClauses: ReturnType<typeof sql>[] = [];
    const changePredicates: ReturnType<typeof sql>[] = [];

    if (input.name !== undefined) {
      const name = validateTreasuryName(input.name);
      setClauses.push(sql`"name" = ${name}`);
      changePredicates.push(sql`cur."name" IS DISTINCT FROM ${name}`);
    }
    if (input.status !== undefined) {
      const status = validateTreasuryStatus(input.status);
      setClauses.push(sql`"status" = ${status}`);
      changePredicates.push(sql`cur."status" IS DISTINCT FROM ${status}`);
    }
    if (setClauses.length === 0) throw emptyTreasuryUpdateError();

    const id = TreasuryId.serialize(input.id);
    const organizationId = OrganizationId.serialize(input.organizationId);

    try {
      const result = await this.db.execute(sql`
        WITH current_row AS MATERIALIZED (
          SELECT * FROM "treasuries"
          WHERE "id" = ${id} AND "organization_id" = ${organizationId}
          FOR UPDATE
        ),
        do_update AS (
          UPDATE "treasuries" AS treasury
          SET ${sql.join(setClauses, sql`, `)}, "updated_at" = NOW()
          FROM current_row AS cur
          WHERE treasury."id" = cur."id"
            AND treasury."organization_id" = cur."organization_id"
            AND (${sql.join(changePredicates, sql` OR `)})
          RETURNING treasury.*
        )
        SELECT
          CASE
            WHEN d."id" IS NOT NULL THEN 'updated'::text
            WHEN c."id" IS NOT NULL THEN 'unchanged'::text
            ELSE 'not_found'::text
          END AS outcome,
          COALESCE(d."id", c."id") AS id,
          COALESCE(d."organization_id", c."organization_id") AS organization_id,
          COALESCE(d."name", c."name") AS name,
          COALESCE(d."status", c."status") AS status,
          COALESCE(d."environment", c."environment") AS environment,
          COALESCE(d."created_at", c."created_at") AS created_at,
          COALESCE(d."updated_at", c."updated_at") AS updated_at
        FROM (SELECT 1) AS singleton
        LEFT JOIN do_update d ON true
        LEFT JOIN current_row c ON true
      `);

      const first = result.rows[0] as Record<string, unknown> | undefined;
      if (!first || first["outcome"] === "not_found") {
        throw treasuryNotFoundError();
      }

      return rowToTreasury({
        id: first["id"] as string,
        organizationId: first["organization_id"] as string,
        name: first["name"] as string,
        status: first["status"] as TreasuryStatus,
        environment: first["environment"] as TreasuryEnvironment,
        createdAt: queryTimestamp(first["created_at"], "createdAt"),
        updatedAt: queryTimestamp(first["updated_at"], "updatedAt"),
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
  throw treasuryPersistenceError(`invalid persisted ${field}`);
}

function mapDatabaseError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (isTreasuryNameUniqueViolation(error)) return treasuryConflictError();
  return treasuryPersistenceError("database operation failed");
}

function isTreasuryNameUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    const candidate = current as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (
      candidate.code === "23505" &&
      candidate.constraint === "treasuries_organization_name_unique"
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}
