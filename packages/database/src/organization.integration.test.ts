/**
 * Organization repository integration tests — run against real PostgreSQL.
 *
 * These tests require a running PostgreSQL instance.
 * Set DATABASE_URL before running:
 *
 *   DATABASE_URL="postgresql://postgres:***@localhost:5432/archon_treasury_test" \
 *     pnpm --filter @archon-treasury/database test:integration
 *
 * WARNING: This test drops and recreates the test database.
 * NEVER run against production or non-test databases.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import pg from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import {
  connectDatabase,
  closeDatabase,
  buildDatabaseConfig,
} from "../src/index.js";
import { PgOrganizationRepository } from "../src/repositories/organization-repository.js";
import {
  OrganizationId,
  OrganizationSlug,
  OrganizationStatus,
  type OrganizationRepository,
} from "@archon-treasury/domain";

const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:***@localhost:5432/archon_treasury_test";

const TEST_DB_MARKER = "archon_treasury_test";

// Guard: refuse to run if the URL doesn't look like a test database
if (!DATABASE_URL.includes(TEST_DB_MARKER)) {
  throw new Error(
    `Refusing to run integration tests against non-test database: ${DATABASE_URL.replace(/:[^@]+@/, ":***@")}`,
  );
}

const testConfig = buildDatabaseConfig({
  databaseUrl: DATABASE_URL,
  poolMin: 0,
  poolMax: 5,
  idleTimeoutMs: 10_000,
  connectionTimeoutMs: 5_000,
  sslMode: "disable",
});

let repo: OrganizationRepository;

beforeAll(async () => {
  // Connect to default postgres database to reset test database
  const adminPool = new pg.Pool({
    connectionString: DATABASE_URL.replace(/\/[^/]+$/, "/postgres"),
  });

  try {
    // Terminate existing connections
    await adminPool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [TEST_DB_MARKER],
    );

    // Drop and recreate
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_MARKER}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_MARKER}`);
  } finally {
    await adminPool.end();
  }

  const db = connectDatabase(testConfig);
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
  });
  await closeDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await closeDatabase();

  // Connect and run migrations
  const db = connectDatabase(testConfig);
  repo = new PgOrganizationRepository(db);

  // Clean organizations table before each test
  const { getPool } = await import("../src/client.js");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM organizations");
  } finally {
    client.release();
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────

function makeId(): ReturnType<typeof OrganizationId.parse> {
  return OrganizationId.parse(
    "0190e4f8-8c12-7abc-9def-" + randomHex(12),
  );
}

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * 16)]!;
  }
  return result;
}

// ── Migration ─────────────────────────────────────────────────────────────

describe("integration: migration creates organizations table", () => {
  it("organizations table exists with expected columns", async () => {
    connectDatabase(testConfig);
    const { getPool } = await import("../src/client.js");
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        ORDER BY ordinal_position
      `);
      const columns = result.rows.map(
        (r: { column_name: string }) => r.column_name,
      );
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("slug");
      expect(columns).toContain("status");
      expect(columns).toContain("created_at");
      expect(columns).toContain("updated_at");
    } finally {
      client.release();
    }
  });

  it("organizations slug index exists", async () => {
    connectDatabase(testConfig);
    const { getPool } = await import("../src/client.js");
    const pool = getPool();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'organizations'
          AND indexname = 'organizations_slug_unique'
      `);
      expect(result.rows.length).toBe(1);
    } finally {
      client.release();
    }
  });
});

// ── Create ────────────────────────────────────────────────────────────────

describe("integration: create organization", () => {
  it("creates and returns organization", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("test-org");
    const org = await repo.create({ id, name: "Test Org", slug });

    expect(org.id).toBe(id);
    expect(org.name).toBe("Test Org");
    expect(org.slug).toBe("test-org");
    expect(org.status).toBe(OrganizationStatus.ACTIVE);
    expect(org.createdAt).toBeInstanceOf(Date);
    expect(org.updatedAt).toBeInstanceOf(Date);
  });
});

// ── Find ──────────────────────────────────────────────────────────────────

describe("integration: find by id", () => {
  it("finds created organization", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("find-by-id");
    await repo.create({ id, name: "Find By ID", slug });

    const found = await repo.findById(id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(id);
    expect(found!.name).toBe("Find By ID");
  });

  it("returns null for unknown id", async () => {
    const unknownId = makeId();
    const found = await repo.findById(unknownId);
    expect(found).toBeNull();
  });
});

describe("integration: find by slug", () => {
  it("finds created organization by slug", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("find-by-slug");
    await repo.create({ id, name: "Find By Slug", slug });

    const found = await repo.findBySlug(slug);
    expect(found).not.toBeNull();
    expect(found!.slug).toBe("find-by-slug");
    expect(found!.name).toBe("Find By Slug");
  });

  it("returns null for unknown slug", async () => {
    const unknownSlug = OrganizationSlug.parse("nonexistent-slug");
    const found = await repo.findBySlug(unknownSlug);
    expect(found).toBeNull();
  });
});

// ── Duplicate slug ────────────────────────────────────────────────────────

describe("integration: duplicate slug conflict", () => {
  it("throws conflict error on duplicate slug", async () => {
    const id1 = makeId();
    const id2 = makeId();
    const slug = OrganizationSlug.parse("duplicate-slug");

    await repo.create({ id: id1, name: "First", slug });

    await expect(
      repo.create({ id: id2, name: "Second", slug }),
    ).rejects.toThrow(/already exists/);
  });
});

// ── Update ────────────────────────────────────────────────────────────────

describe("integration: update organization", () => {
  it("updates name", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("update-name");
    await repo.create({ id, name: "Original Name", slug });

    const updated = await repo.update({ id, name: "Updated Name" });
    expect(updated.name).toBe("Updated Name");
    expect(updated.slug).toBe("update-name"); // unchanged
  });

  it("updates slug", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("update-slug-old");
    await repo.create({ id, name: "Update Slug", slug });

    const newSlug = OrganizationSlug.parse("update-slug-new");
    const updated = await repo.update({ id, slug: newSlug });
    expect(updated.slug).toBe("update-slug-new");
  });

  it("throws conflict on duplicate slug during update", async () => {
    const id1 = makeId();
    const id2 = makeId();
    const slug1 = OrganizationSlug.parse("slug-first");
    const slug2 = OrganizationSlug.parse("slug-second");

    await repo.create({ id: id1, name: "First", slug: slug1 });
    await repo.create({ id: id2, name: "Second", slug: slug2 });

    // Try to change id2's slug to slug1 (already taken)
    await expect(
      repo.update({ id: id2, slug: slug1 }),
    ).rejects.toThrow(/already exists/);
  });

  it("throws not found for unknown id", async () => {
    const unknownId = makeId();
    await expect(
      repo.update({ id: unknownId, name: "New" }),
    ).rejects.toThrow(/not found/);
  });

  it("updates status to suspended", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("suspend-test");
    await repo.create({ id, name: "Suspend Test", slug });

    const updated = await repo.update({
      id,
      status: OrganizationStatus.SUSPENDED,
    });
    expect(updated.status).toBe(OrganizationStatus.SUSPENDED);
  });

  it("updates status back to active", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("activate-test");
    await repo.create({ id, name: "Activate Test", slug });

    // Suspend first
    await repo.update({ id, status: OrganizationStatus.SUSPENDED });
    // Then activate
    const updated = await repo.update({
      id,
      status: OrganizationStatus.ACTIVE,
    });
    expect(updated.status).toBe(OrganizationStatus.ACTIVE);
  });

  it("created_at is preserved after update", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("timestamp-preserved");
    const created = await repo.create({ id, name: "Timestamp", slug });
    const originalCreatedAt = created.createdAt;

    const updated = await repo.update({ id, name: "Updated" });
    expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime());
  });

  it("updated_at changes after update", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("timestamp-changes");
    const created = await repo.create({ id, name: "Timestamp", slug });

    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await repo.update({ id, name: "Updated" });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      created.updatedAt.getTime(),
    );
  });

  it("same name preserves updatedAt", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("same-name");
    const created = await repo.create({ id, name: "Same Name", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await repo.update({ id, name: "Same Name" });
    expect(updated.name).toBe("Same Name");
    expect(updated.updatedAt.getTime()).toBe(created.updatedAt.getTime());
  });

  it("same slug preserves updatedAt", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("same-slug");
    const created = await repo.create({ id, name: "Same Slug", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await repo.update({ id, slug: OrganizationSlug.parse("same-slug") });
    expect(updated.slug).toBe("same-slug");
    expect(updated.updatedAt.getTime()).toBe(created.updatedAt.getTime());
  });

  it("same status preserves updatedAt", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("same-status");
    const created = await repo.create({ id, name: "Same Status", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await repo.update({ id, status: OrganizationStatus.ACTIVE });
    expect(updated.status).toBe(OrganizationStatus.ACTIVE);
    expect(updated.updatedAt.getTime()).toBe(created.updatedAt.getTime());
  });

  it("mixed patch: one same + one different changes updatedAt", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("mixed-patch");
    const created = await repo.create({ id, name: "Mixed", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Same name, different slug → should update
    const updated = await repo.update({ id, name: "Mixed", slug: OrganizationSlug.parse("mixed-new") });
    expect(updated.name).toBe("Mixed");
    expect(updated.slug).toBe("mixed-new");
    expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it("empty update is rejected as ValidationError", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("empty-update");
    await repo.create({ id, name: "Empty", slug });

    await expect(repo.update({ id })).rejects.toThrow(/empty/i);
  });

  it("updated result has Date timestamps (not string)", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("date-types-update");
    await repo.create({ id, name: "DateTypes", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await repo.update({ id, name: "DateTypesUpdated" });

    expect(updated.createdAt).toBeInstanceOf(Date);
    expect(updated.updatedAt).toBeInstanceOf(Date);
    expect(updated.createdAt.getTime()).not.toBeNaN();
    expect(updated.updatedAt.getTime()).not.toBeNaN();
  });

  it("unchanged/no-op result has Date timestamps (not string)", async () => {
    const id = makeId();
    const slug = OrganizationSlug.parse("date-types-noop");
    const created = await repo.create({ id, name: "DateNoop", slug });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const unchanged = await repo.update({ id, name: "DateNoop" });

    expect(unchanged.createdAt).toBeInstanceOf(Date);
    expect(unchanged.updatedAt).toBeInstanceOf(Date);
    expect(unchanged.createdAt.getTime()).not.toBeNaN();
    expect(unchanged.updatedAt.getTime()).not.toBeNaN();
    // No-op preserves original timestamps
    expect(unchanged.createdAt.getTime()).toBe(created.createdAt.getTime());
    expect(unchanged.updatedAt.getTime()).toBe(created.updatedAt.getTime());
  });
});

// ── Transaction ───────────────────────────────────────────────────────────

describe("integration: transaction support", () => {
  it("repository works with transaction handle", async () => {
    connectDatabase(testConfig);
    const { withTransaction } = await import("../src/index.js");

    const result = await withTransaction(async (tx) => {
      const txRepo = new PgOrganizationRepository(tx);
      const id = makeId();
      const slug = OrganizationSlug.parse("tx-test");
      const org = await txRepo.create({ id, name: "TX Test", slug });
      return org;
    });

    expect(result.name).toBe("TX Test");

    // Verify persisted (auto-committed by withTransaction)
    const found = await repo.findById(result.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("TX Test");
  });

  it("transaction rollback does not persist", async () => {
    connectDatabase(testConfig);
    const { withTransaction } = await import("../src/index.js");

    const id = makeId();
    const slug = OrganizationSlug.parse("rollback-test");

    await expect(
      withTransaction(async (tx) => {
        const txRepo = new PgOrganizationRepository(tx);
        await txRepo.create({ id, name: "Rollback", slug });
        throw new Error("deliberate rollback");
      }),
    ).rejects.toThrow("deliberate rollback");

    // Should not exist
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });
});
