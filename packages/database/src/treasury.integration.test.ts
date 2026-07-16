import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import {
  OrganizationId,
  OrganizationSlug,
  TreasuryEnvironment,
  TreasuryId,
  TreasuryStatus,
} from "@archon-treasury/domain";
import {
  PgOrganizationRepository,
  PgTreasuryRepository,
  buildDatabaseConfig,
  closeDatabase,
  connectDatabase,
  getPool,
  withTransaction,
  type Database,
} from "./index.js";

const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:***@localhost:5432/archon_treasury_test";
const TEST_DATABASE = "archon_treasury_test";
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

if (!DATABASE_URL.includes(TEST_DATABASE)) {
  throw new Error("Refusing to run treasury integration tests outside test database");
}

const config = buildDatabaseConfig({
  databaseUrl: DATABASE_URL,
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
  sslMode: "disable",
});

let db: Database;
let organizations: PgOrganizationRepository;
let treasuries: PgTreasuryRepository;

const organizationId = () => OrganizationId.parse(randomUUID());
const treasuryId = () => TreasuryId.parse(randomUUID());

async function createOrganization(name = "Test Organization") {
  const id = organizationId();
  return organizations.create({
    id,
    name,
    slug: OrganizationSlug.parse(`org-${id.slice(0, 8)}`),
  });
}

async function resetDatabase(): Promise<void> {
  const admin = new pg.Pool({
    connectionString: DATABASE_URL.replace(/\/[^/]+$/, "/postgres"),
  });
  try {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [TEST_DATABASE],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`);
    await admin.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } finally {
    await admin.end();
  }
}

async function expectConstraint(
  operation: Promise<unknown>,
  expectedConstraint: string,
): Promise<void> {
  try {
    await operation;
    expect.fail(`expected constraint ${expectedConstraint} to reject`);
  } catch (error) {
    let current: unknown = error;
    const seen = new Set<unknown>();
    while (typeof current === "object" && current !== null && !seen.has(current)) {
      seen.add(current);
      const candidate = current as { constraint?: unknown; cause?: unknown };
      if (candidate.constraint === expectedConstraint) return;
      current = candidate.cause;
    }
    expect.fail(`expected database constraint ${expectedConstraint}`);
  }
}

beforeAll(async () => {
  await resetDatabase();
  db = connectDatabase(config);
  await migrate(db, {
    migrationsFolder: MIGRATIONS_FOLDER,
    migrationsSchema: "public",
  });
  await migrate(db, {
    migrationsFolder: MIGRATIONS_FOLDER,
    migrationsSchema: "public",
  });
  organizations = new PgOrganizationRepository(db);
  treasuries = new PgTreasuryRepository(db);
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  const client = await getPool().connect();
  try {
    await client.query("TRUNCATE treasuries, organizations RESTART IDENTITY CASCADE");
  } finally {
    client.release();
  }
});

describe("migration 0003", () => {
  it("runs from empty, reruns idempotently, and records exactly four migrations", async () => {
    const result = await getPool().query(
      'SELECT COUNT(*)::int AS count FROM public."__drizzle_migrations"',
    );
    expect(result.rows[0]?.count).toBe(4);
  });

  it("creates named constraints, foreign key, and indexes", async () => {
    const constraints = await getPool().query(
      "SELECT conname FROM pg_constraint WHERE conrelid = 'treasuries'::regclass",
    );
    const constraintNames = new Set(constraints.rows.map((row) => row.conname));
    for (const name of [
      "treasuries_pkey",
      "treasuries_name_length",
      "treasuries_name_trimmed",
      "treasuries_status_check",
      "treasuries_environment_check",
      "treasuries_organization_id_organizations_id_fk",
    ]) {
      expect(constraintNames.has(name)).toBe(true);
    }

    const indexes = await getPool().query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'treasuries'",
    );
    const indexNames = new Set(indexes.rows.map((row) => row.indexname));
    for (const name of [
      "treasuries_organization_name_unique",
      "treasuries_organization_idx",
      "treasuries_status_idx",
      "treasuries_environment_idx",
    ]) {
      expect(indexNames.has(name)).toBe(true);
    }
  });
});

describe("PgTreasuryRepository create", () => {
  it.each([TreasuryEnvironment.TESTNET, TreasuryEnvironment.MAINNET])(
    "creates %s treasury metadata with active default and normalized name",
    async (environment) => {
      const organization = await createOrganization();
      const id = treasuryId();
      const treasury = await treasuries.create({
        id,
        organizationId: organization.id,
        name: "  Main Treasury  ",
        environment,
      });
      expect(treasury).toMatchObject({
        id,
        organizationId: organization.id,
        name: "Main Treasury",
        status: TreasuryStatus.ACTIVE,
        environment,
      });
      expect(treasury.createdAt).toBeInstanceOf(Date);
      expect(treasury.updatedAt).toBeInstanceOf(Date);
    },
  );

  it("enforces organization foreign key without PostgreSQL leakage", async () => {
    const input = {
      id: treasuryId(),
      organizationId: organizationId(),
      name: "Orphan",
      environment: TreasuryEnvironment.TESTNET,
    };
    await expect(treasuries.create(input)).rejects.toMatchObject({
      code: "DATA_INTEGRITY_ERROR",
      message: "Treasury persistence mapping failed: database operation failed",
    });
  });
});

describe("scoped find and list", () => {
  it("finds only by matching organization and treasury IDs", async () => {
    const first = await createOrganization("First");
    const second = await createOrganization("Second");
    const id = treasuryId();
    await treasuries.create({
      id,
      organizationId: first.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
    expect(await treasuries.findById(first.id, id)).toMatchObject({ id });
    expect(await treasuries.findById(second.id, id)).toBeNull();
    expect(await treasuries.findById(first.id, treasuryId())).toBeNull();
  });

  it("lists only one organization in deterministic created_at/id order", async () => {
    const first = await createOrganization("First");
    const second = await createOrganization("Second");
    const laterId = TreasuryId.parse("ffffffff-ffff-4fff-bfff-ffffffffffff");
    const earlierId = TreasuryId.parse("00000000-0000-4000-8000-000000000001");
    await treasuries.create({
      id: laterId,
      organizationId: first.id,
      name: "Later ID",
      environment: TreasuryEnvironment.TESTNET,
    });
    await treasuries.create({
      id: earlierId,
      organizationId: first.id,
      name: "Earlier ID",
      environment: TreasuryEnvironment.TESTNET,
    });
    await treasuries.create({
      id: treasuryId(),
      organizationId: second.id,
      name: "Other Tenant",
      environment: TreasuryEnvironment.TESTNET,
    });

    await db.execute(sql`
      UPDATE treasuries
      SET created_at = '2026-01-01T00:00:00Z'
      WHERE organization_id = ${first.id}
    `);
    expect((await treasuries.listByOrganization(first.id)).map((item) => item.id)).toEqual([
      earlierId,
      laterId,
    ]);
    expect(await treasuries.listByOrganization(organizationId())).toEqual([]);
  });
});

describe("organization-scoped name uniqueness", () => {
  it("maps exact and surrounding-space equivalent duplicates to stable conflict", async () => {
    const organization = await createOrganization();
    await treasuries.create({
      id: treasuryId(),
      organizationId: organization.id,
      name: "Reserve",
      environment: TreasuryEnvironment.TESTNET,
    });
    for (const name of ["Reserve", "  Reserve  "]) {
      await expect(
        treasuries.create({
          id: treasuryId(),
          organizationId: organization.id,
          name,
          environment: TreasuryEnvironment.TESTNET,
        }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "A treasury with this name already exists in this organization",
      });
    }
  });

  it("allows the same normalized name in different organizations", async () => {
    const first = await createOrganization("First");
    const second = await createOrganization("Second");
    await treasuries.create({
      id: treasuryId(),
      organizationId: first.id,
      name: "Reserve",
      environment: TreasuryEnvironment.TESTNET,
    });
    await expect(
      treasuries.create({
        id: treasuryId(),
        organizationId: second.id,
        name: "Reserve",
        environment: TreasuryEnvironment.MAINNET,
      }),
    ).resolves.toMatchObject({ organizationId: second.id });
  });
});

describe("scoped update", () => {
  it("renames, suspends, activates, and updates name/status together", async () => {
    const organization = await createOrganization();
    const id = treasuryId();
    const created = await treasuries.create({
      id,
      organizationId: organization.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));

    const combined = await treasuries.update({
      id,
      organizationId: organization.id,
      name: "  Payroll  ",
      status: TreasuryStatus.SUSPENDED,
    });
    expect(combined).toMatchObject({
      name: "Payroll",
      status: TreasuryStatus.SUSPENDED,
      environment: TreasuryEnvironment.TESTNET,
      organizationId: organization.id,
    });
    expect(combined.createdAt.getTime()).toBe(created.createdAt.getTime());
    expect(combined.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());

    const active = await treasuries.update({
      id,
      organizationId: organization.id,
      status: TreasuryStatus.ACTIVE,
    });
    expect(active.status).toBe(TreasuryStatus.ACTIVE);
  });

  it("preserves updatedAt for same-value update", async () => {
    const organization = await createOrganization();
    const id = treasuryId();
    const created = await treasuries.create({
      id,
      organizationId: organization.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const unchanged = await treasuries.update({
      id,
      organizationId: organization.id,
      name: " Operations ",
      status: TreasuryStatus.ACTIVE,
    });
    expect(unchanged.updatedAt.getTime()).toBe(created.updatedAt.getTime());
  });

  it("rejects empty, missing, and wrong-organization updates", async () => {
    const owner = await createOrganization("Owner");
    const other = await createOrganization("Other");
    const id = treasuryId();
    await treasuries.create({
      id,
      organizationId: owner.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
    await expect(treasuries.update({ id, organizationId: owner.id })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(
      treasuries.update({
        id: treasuryId(),
        organizationId: owner.id,
        name: "Missing",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Treasury not found" });
    await expect(
      treasuries.update({ id, organizationId: other.id, name: "Cross Tenant" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Treasury not found" });
    expect(await treasuries.findById(owner.id, id)).toMatchObject({
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
  });

  it("maps duplicate rename to stable conflict without raw database details", async () => {
    const organization = await createOrganization();
    const first = treasuryId();
    const second = treasuryId();
    await treasuries.create({
      id: first,
      organizationId: organization.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });
    await treasuries.create({
      id: second,
      organizationId: organization.id,
      name: "Reserve",
      environment: TreasuryEnvironment.TESTNET,
    });
    await expect(
      treasuries.update({
        id: second,
        organizationId: organization.id,
        name: "Operations",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A treasury with this name already exists in this organization",
    });
  });
});

describe("database constraints and persistence mapping", () => {
  it.each([
    ["status", "invalid", "treasuries_status_check"],
    ["environment", "invalid", "treasuries_environment_check"],
    ["name", " Untrimmed ", "treasuries_name_trimmed"],
  ])("rejects invalid persisted %s via %s", async (column, value, constraint) => {
    const organization = await createOrganization();
    const id = treasuryId();
    const query =
      column === "status"
        ? sql`INSERT INTO treasuries (id, organization_id, name, status, environment) VALUES (${id}, ${organization.id}, 'Test', ${value}, 'testnet')`
        : column === "environment"
          ? sql`INSERT INTO treasuries (id, organization_id, name, status, environment) VALUES (${id}, ${organization.id}, 'Test', 'active', ${value})`
          : sql`INSERT INTO treasuries (id, organization_id, name, status, environment) VALUES (${id}, ${organization.id}, ${value}, 'active', 'testnet')`;
    await expectConstraint(db.execute(query), constraint);
  });

  it("maps malformed stored values to persistence errors when constraints are bypassed", async () => {
    const organization = await createOrganization();
    const id = treasuryId();
    await treasuries.create({
      id,
      organizationId: organization.id,
      name: "Operations",
      environment: TreasuryEnvironment.TESTNET,
    });

    await expect(
      withTransaction(async (tx) => {
        const repository = new PgTreasuryRepository(tx);
        await tx.execute(
          sql`ALTER TABLE treasuries DROP CONSTRAINT treasuries_status_check`,
        );
        await tx.execute(sql`UPDATE treasuries SET status = 'invalid' WHERE id = ${id}`);
        await expect(repository.findById(organization.id, id)).rejects.toMatchObject({
          code: "DATA_INTEGRITY_ERROR",
          message: "Treasury persistence mapping failed: invalid persisted status",
        });
        await tx.execute(sql`UPDATE treasuries SET status = 'active' WHERE id = ${id}`);
        await tx.execute(
          sql`ALTER TABLE treasuries DROP CONSTRAINT treasuries_name_trimmed`,
        );
        await tx.execute(sql`UPDATE treasuries SET name = ' Operations ' WHERE id = ${id}`);
        await expect(repository.findById(organization.id, id)).rejects.toMatchObject({
          code: "DATA_INTEGRITY_ERROR",
          message: "Treasury persistence mapping failed: invalid persisted name",
        });
        throw new Error("rollback malformed fixtures");
      }, db),
    ).rejects.toThrow("rollback malformed fixtures");
  });
});

describe("transaction-bound repository", () => {
  it("creates organization and treasury in one transaction and commits", async () => {
    const organization = organizationId();
    const treasury = treasuryId();
    await withTransaction(async (tx) => {
      await new PgOrganizationRepository(tx).create({
        id: organization,
        name: "Transactional",
        slug: OrganizationSlug.parse(`org-${organization.slice(0, 8)}`),
      });
      await new PgTreasuryRepository(tx).create({
        id: treasury,
        organizationId: organization,
        name: "Operations",
        environment: TreasuryEnvironment.TESTNET,
      });
    }, db);
    expect(await treasuries.findById(organization, treasury)).not.toBeNull();
  });

  it("rolls back treasury creation on forced failure", async () => {
    const organization = await createOrganization();
    const id = treasuryId();
    await expect(
      withTransaction(async (tx) => {
        await new PgTreasuryRepository(tx).create({
          id,
          organizationId: organization.id,
          name: "Rollback",
          environment: TreasuryEnvironment.TESTNET,
        });
        throw new Error("forced rollback");
      }, db),
    ).rejects.toThrow("forced rollback");
    expect(await treasuries.findById(organization.id, id)).toBeNull();
  });
});
