import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  MembershipId,
  MembershipRole,
  MembershipStatus,
  OrganizationId,
  OrganizationSlug,
  UserEmail,
  UserId,
  UserStatus,
  createActiveOwnerMembership,
} from "@archon-treasury/domain";
import {
  PgOrganizationMemberRepository,
  PgOrganizationRepository,
  PgUserRepository,
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
  throw new Error("Refusing to run access integration tests outside test database");
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
let users: PgUserRepository;
let members: PgOrganizationMemberRepository;
let organizations: PgOrganizationRepository;

const userId = () => UserId.parse(randomUUID());
const organizationId = () => OrganizationId.parse(randomUUID());
const membershipId = () => MembershipId.parse(randomUUID());

async function createUser(email = `${randomUUID()}@example.com`) {
  return users.create({ id: userId(), email, displayName: "Test User" });
}

async function createOrganization() {
  const id = organizationId();
  return organizations.create({
    id,
    name: "Test Organization",
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

beforeAll(async () => {
  await resetDatabase();
  db = connectDatabase(config);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  users = new PgUserRepository(db);
  members = new PgOrganizationMemberRepository(db);
  organizations = new PgOrganizationRepository(db);
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  const client = await getPool().connect();
  try {
    await client.query(
      "TRUNCATE organization_members, organizations, users RESTART IDENTITY CASCADE",
    );
  } finally {
    client.release();
  }
});

describe("migration 0002", () => {
  it("migrates from empty and reruns idempotently with required tables and indexes", async () => {
    const client = await getPool().connect();
    try {
      const migrationCount = await client.query(
        'SELECT COUNT(*)::int AS count FROM public."__drizzle_migrations"',
      );
      expect(migrationCount.rows[0]?.count).toBe(3);

      const tables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'organization_members') ORDER BY table_name",
      );
      expect(tables.rows.map((row) => row.table_name)).toEqual([
        "organization_members",
        "users",
      ]);

      const indexes = await client.query(
        "SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'organization_members')",
      );
      const names = new Set(indexes.rows.map((row) => row.indexname));
      for (const name of [
        "users_email_unique",
        "organization_members_org_user_unique",
        "organization_members_org_idx",
        "organization_members_user_idx",
        "organization_members_role_idx",
        "organization_members_status_idx",
      ]) {
        expect(names.has(name)).toBe(true);
      }
    } finally {
      client.release();
    }
  });
});

describe("PgUserRepository", () => {
  it("creates, finds, normalizes, updates, and preserves timestamps on no-op", async () => {
    const id = userId();
    const created = await users.create({
      id,
      email: "  PERSON@Example.COM ",
      displayName: " Person ",
    });
    expect(created.email).toBe("person@example.com");
    expect(created.status).toBe(UserStatus.ACTIVE);
    expect(await users.findById(id)).toEqual(created);
    expect(await users.findByEmail(UserEmail.parse("PERSON@example.com"))).toEqual(
      created,
    );

    const updated = await users.update({
      id,
      displayName: "Renamed",
      status: UserStatus.SUSPENDED,
    });
    expect(updated.displayName).toBe("Renamed");
    expect(updated.status).toBe(UserStatus.SUSPENDED);

    const unchanged = await users.update({ id, displayName: "Renamed" });
    expect(unchanged.updatedAt.getTime()).toBe(updated.updatedAt.getTime());
  });

  it("maps normalized duplicate email and missing/empty updates to stable errors", async () => {
    await createUser("duplicate@example.com");
    await expect(createUser(" DUPLICATE@EXAMPLE.COM ")).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A user with this email already exists",
    });
    const missing = userId();
    await expect(users.update({ id: missing, displayName: "Missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(users.update({ id: missing })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("PgOrganizationMemberRepository", () => {
  it("creates, finds, lists, updates role/status, and preserves no-op timestamp", async () => {
    const user = await createUser();
    const firstOrganization = await createOrganization();
    const secondOrganization = await createOrganization();
    const firstId = membershipId();
    const created = await members.create({
      id: firstId,
      organizationId: firstOrganization.id,
      userId: user.id,
      role: MembershipRole.TREASURY_OPERATOR,
      status: MembershipStatus.ACTIVE,
    });
    await members.create({
      id: membershipId(),
      organizationId: secondOrganization.id,
      userId: user.id,
      role: MembershipRole.AUDITOR,
      status: MembershipStatus.ACTIVE,
    });

    expect(await members.findById(firstId, firstOrganization.id)).toEqual(created);
    expect(
      await members.findByOrganizationAndUser(firstOrganization.id, user.id),
    ).toEqual(created);
    expect(await members.listByOrganization(firstOrganization.id)).toHaveLength(1);
    expect(await members.listByUser(user.id)).toHaveLength(2);

    const updated = await members.update({
      id: firstId,
      organizationId: firstOrganization.id,
      role: MembershipRole.TREASURY_APPROVER,
      status: MembershipStatus.SUSPENDED,
    });
    expect(updated.role).toBe(MembershipRole.TREASURY_APPROVER);
    expect(updated.status).toBe(MembershipStatus.SUSPENDED);
    const unchanged = await members.update({
      id: firstId,
      organizationId: firstOrganization.id,
      role: MembershipRole.TREASURY_APPROVER,
    });
    expect(unchanged.updatedAt.getTime()).toBe(updated.updatedAt.getTime());
  });

  it("enforces exact organization scoping and cross-organization isolation", async () => {
    const user = await createUser();
    const first = await createOrganization();
    const second = await createOrganization();
    const id = membershipId();
    await members.create({
      id,
      organizationId: first.id,
      userId: user.id,
      role: MembershipRole.AUDITOR,
      status: MembershipStatus.ACTIVE,
    });

    expect(await members.findById(id, second.id)).toBeNull();
    expect(await members.findByOrganizationAndUser(second.id, user.id)).toBeNull();
    await expect(
      members.update({
        id,
        organizationId: second.id,
        role: MembershipRole.OWNER,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await members.findById(id, first.id))?.role).toBe(
      MembershipRole.AUDITOR,
    );
  });

  it("maps duplicate membership and foreign-key failures without PostgreSQL leakage", async () => {
    const user = await createUser();
    const organization = await createOrganization();
    await members.create({
      id: membershipId(),
      organizationId: organization.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    });
    await expect(
      members.create({
        id: membershipId(),
        organizationId: organization.id,
        userId: user.id,
        role: MembershipRole.AUDITOR,
        status: MembershipStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "User already has a membership in this organization",
    });

    await expect(
      members.create({
        id: membershipId(),
        organizationId: organizationId(),
        userId: user.id,
        role: MembershipRole.AUDITOR,
        status: MembershipStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      code: "DATA_INTEGRITY_ERROR",
      message: "OrganizationMember persistence mapping failed: database operation failed",
    });
    await expect(
      members.create({
        id: membershipId(),
        organizationId: organization.id,
        userId: userId(),
        role: MembershipRole.AUDITOR,
        status: MembershipStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      code: "DATA_INTEGRITY_ERROR",
      message: "OrganizationMember persistence mapping failed: database operation failed",
    });
  });
});

describe("transactions and owner bootstrap", () => {
  it("commits an active owner membership with user and organization", async () => {
    const ids = {
      user: userId(),
      organization: organizationId(),
      membership: membershipId(),
    };
    await withTransaction(async (tx) => {
      const txUsers = new PgUserRepository(tx);
      const txOrganizations = new PgOrganizationRepository(tx);
      const txMembers = new PgOrganizationMemberRepository(tx);
      await txUsers.create({
        id: ids.user,
        email: "owner@example.com",
        displayName: "Owner",
      });
      await txOrganizations.create({
        id: ids.organization,
        name: "Owner Organization",
        slug: OrganizationSlug.parse("owner-organization"),
      });
      const owner = await createActiveOwnerMembership(txMembers, {
        id: ids.membership,
        organizationId: ids.organization,
        userId: ids.user,
      });
      expect(owner.role).toBe(MembershipRole.OWNER);
      expect(owner.status).toBe(MembershipStatus.ACTIVE);
    }, db);
    expect(await members.findById(ids.membership, ids.organization)).not.toBeNull();
  });

  it("rolls back user, organization, and owner membership together", async () => {
    const ids = {
      user: userId(),
      organization: organizationId(),
      membership: membershipId(),
    };
    await expect(
      withTransaction(async (tx) => {
        const txUsers = new PgUserRepository(tx);
        const txOrganizations = new PgOrganizationRepository(tx);
        const txMembers = new PgOrganizationMemberRepository(tx);
        await txUsers.create({
          id: ids.user,
          email: "rollback@example.com",
          displayName: "Rollback",
        });
        await txOrganizations.create({
          id: ids.organization,
          name: "Rollback Organization",
          slug: OrganizationSlug.parse("rollback-organization"),
        });
        await createActiveOwnerMembership(txMembers, {
          id: ids.membership,
          organizationId: ids.organization,
          userId: ids.user,
        });
        throw new Error("deliberate rollback");
      }, db),
    ).rejects.toThrow("deliberate rollback");
    expect(await users.findById(ids.user)).toBeNull();
    expect(await organizations.findById(ids.organization)).toBeNull();
    expect(await members.findById(ids.membership, ids.organization)).toBeNull();
  });
});

describe("persistence validation", () => {
  it("maps malformed persisted status and role to data-integrity errors", async () => {
    const user = await createUser();
    const organization = await createOrganization();
    await members.create({
      id: membershipId(),
      organizationId: organization.id,
      userId: user.id,
      role: MembershipRole.AUDITOR,
      status: MembershipStatus.ACTIVE,
    });

    await expect(
      withTransaction(async (tx) => {
        const txUsers = new PgUserRepository(tx);
        const txMembers = new PgOrganizationMemberRepository(tx);

        await tx.execute(sql`ALTER TABLE users DROP CONSTRAINT users_status_check`);
        await tx.execute(
          sql`UPDATE users SET status = 'invalid' WHERE id = ${user.id}`,
        );
        await expect(txUsers.findById(user.id)).rejects.toMatchObject({
          code: "DATA_INTEGRITY_ERROR",
        });

        await tx.execute(
          sql`UPDATE users SET status = 'active' WHERE id = ${user.id}`,
        );
        await tx.execute(
          sql`ALTER TABLE users DROP CONSTRAINT users_display_name_trimmed`,
        );
        await tx.execute(
          sql`UPDATE users SET display_name = ' Test User ' WHERE id = ${user.id}`,
        );
        await expect(txUsers.findById(user.id)).rejects.toMatchObject({
          code: "DATA_INTEGRITY_ERROR",
        });

        await tx.execute(
          sql`ALTER TABLE organization_members DROP CONSTRAINT organization_members_role_check`,
        );
        await tx.execute(sql`UPDATE organization_members SET role = 'invalid'`);
        await expect(
          txMembers.findByOrganizationAndUser(organization.id, user.id),
        ).rejects.toMatchObject({ code: "DATA_INTEGRITY_ERROR" });
        throw new Error("rollback malformed fixtures");
      }, db),
    ).rejects.toThrow("rollback malformed fixtures");
  });
});
