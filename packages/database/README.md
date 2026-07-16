# @archon-treasury/database

> PostgreSQL database client, health checks, transaction helpers, migration tooling, and repository implementations for Archon Treasury.

## Status

Phase 1 — Organization tenant root, minimal users, organization membership, and explicit RBAC persistence foundation.

## Architecture

```
packages/database/
├── src/
│   ├── config.ts          # Database config validation (Zod) — explicit input only
│   ├── client.ts          # Connection pool singleton (Drizzle + pg) + SSL config
│   ├── health.ts          # SELECT 1 with SET LOCAL statement_timeout
│   ├── transaction.ts     # Typed transaction boundaries (commit/rollback)
│   ├── schema/
│   │   ├── index.ts       # Schema export boundary
│   │   ├── organizations.ts       # Tenant root
│   │   ├── users.ts               # Minimal user identity
│   │   └── organization-members.ts # User ↔ organization role binding
│   ├── repositories/
│   │   ├── organization-repository.ts
│   │   ├── user-repository.ts
│   │   └── organization-member-repository.ts
│   ├── index.ts           # Public API barrel
│   └── *.test.ts          # Unit + integration tests
├── migrations/            # Drizzle-generated SQL (committed to Git)
│   ├── 0000_baseline.sql   # Baseline migration (no business tables)
│   ├── 0001_organization.sql  # Organization table + slug unique index
│   ├── 0002_users_organization_members.sql
│   └── meta/
│       ├── _journal.json
│       ├── 0000_snapshot.json
│       └── 0001_snapshot.json
├── drizzle.config.ts      # Drizzle Kit CLI config
├── package.json
└── tsconfig.json
```

## Organization Domain

Organization is the **tenant root** for Archon Treasury. All future records (treasury, wallet, membership, policy, proposals, executions, audit events) will reference `organization_id`.

### Schema

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PRIMARY KEY, application-generated |
| `name` | text | NOT NULL, 1–255 chars after trim |
| `slug` | text | NOT NULL, UNIQUE INDEX, lowercase canonical |
| `status` | text | NOT NULL, DEFAULT 'active', enum: active, suspended |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Slug Rules

- Lowercase canonical (trimmed, normalized)
- Only lowercase letters (a-z), digits (0-9), and hyphens (-)
- No leading/trailing hyphens
- No consecutive hyphens (collapsed during normalization)
- Unique globally
- Max 63 characters

### Status Rules

- `active` — default, normal operation
- `suspended` — read-only (future: treasury mutations blocked)
- Both statuses are valid; no other statuses defined

### Tenant Boundary

- Organization IS the tenant root
- Future treasury, wallet, policy, proposal, execution, and audit records will reference `organization_id`
- Users may belong to multiple organizations through `organization_members`
- One `(organization_id, user_id)` membership is allowed per organization

## Users and organization members

`users` stores minimal identity only: normalized lowercase email, display name,
status, and timestamps. `organization_members` binds a user to the tenant root
with one of: Owner, Organization Admin, Treasury Operator, Treasury Approver,
or Auditor.

RBAC is separate from future approval policy. This migration does not grant
Hermes or other agents financial approval permission and does not implement
treasury, Circle, CCTP, wallet execution, proposals, authentication, API
routes, frontend, MCP, or x402 behavior.

## Repository Interface

```typescript
// From @archon-treasury/domain
interface OrganizationRepository {
  create(input: CreateOrganizationInput): Promise<Organization>;
  findById(id: OrganizationId): Promise<Organization | null>;
  findBySlug(slug: OrganizationSlug): Promise<Organization | null>;
  update(input: UpdateOrganizationInput): Promise<Organization>;
}
```

## PostgreSQL Repository

```typescript
import { PgOrganizationRepository } from "@archon-treasury/database";

const repo = new PgOrganizationRepository(db);
// or within a transaction:
const repo = new PgOrganizationRepository(tx);
```

- All queries parameterized (no SQL interpolation)
- Unique slug violations mapped to `ConflictError`
- Unknown IDs mapped to `NotFoundError`
- Accepts `Database | DatabaseTransaction` for transaction support

## Decisions

- **ORM:** Drizzle ORM (type-safe, SQL-like API)
- **Driver:** `pg` (node-postgres)
- **Migration:** `drizzle-kit generate` → SQL files → `drizzle-kit migrate`
- **PostgreSQL version:** 16 (pinned)
- **Connection:** Lazy pool creation, singleton per process
- **Config:** Validated via `@archon-treasury/config` (single env source)
- **TLS:** `DATABASE_SSL_MODE` — `"disable"` (default) or `"require"`

## Local Development

### Start PostgreSQL

```bash
cd infra/compose
docker compose up -d postgres
```

### Required Environment Variables

```bash
DATABASE_URL="postgresql://postgres:***@localhost:5432/archon_treasury"
```

### Generate Migration

```bash
pnpm --filter @archon-treasury/database db:generate
```

### Run Migration

```bash
pnpm --filter @archon-treasury/database db:migrate
```

## Testing

### Unit Tests (no database required)

```bash
pnpm --filter @archon-treasury/database test:unit
```

### Integration Tests (requires PostgreSQL)

```bash
DATABASE_URL="postgresql://postgres:***@localhost:5432/archon_treasury_test" \
  pnpm --filter @archon-treasury/database test:integration
```

## Security

- Credentials never logged or exported in plaintext
- No automatic destructive reset
- No migration auto-run at server startup
- Database config accepts only explicit input — no ambient `process.env` reads
- No arbitrary SQL, no string interpolation in queries
- Unique slug conflicts mapped to stable domain errors
- Duplicate normalized user emails and duplicate organization memberships map to stable conflicts
- Membership authorization lookups require explicit organization scope
- No raw PostgreSQL error leakage to callers
