# @archon-treasury/database

> PostgreSQL database client, health checks, transaction helpers, and migration tooling for Archon Treasury.

## Status

Phase 0 — Foundation. No business tables yet.

## Architecture

```
packages/database/
├── src/
│   ├── config.ts          # Database config validation (Zod)
│   ├── client.ts          # Connection pool singleton (Drizzle + pg)
│   ├── health.ts          # SELECT 1 health check
│   ├── transaction.ts     # Typed transaction boundaries (commit/rollback)
│   ├── schema/
│   │   └── index.ts       # Schema export boundary (empty — no business tables)
│   ├── index.ts           # Public API barrel
│   └── *.test.ts          # Unit + integration tests
├── migrations/            # Drizzle-generated SQL (committed to Git)
├── drizzle.config.ts      # Drizzle Kit CLI config
├── package.json
└── tsconfig.json
```

## Decisions

- **ORM:** Drizzle ORM (type-safe, SQL-like API)
- **Driver:** `pg` (node-postgres)
- **Migration:** `drizzle-kit generate` → SQL files → `drizzle-kit migrate`
- **PostgreSQL version:** 16 (pinned)
- **Connection:** Lazy pool creation, singleton per process
- **Config:** Validated via `@archon-treasury/config` (single env source)

## Local Development

### Start PostgreSQL

```bash
cd infra/compose
docker compose up -d postgres
```

PostgreSQL is available at `postgresql://postgres:postgres@localhost:5432/archon_treasury`.

### Required Environment Variables

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/archon_treasury"
# Optional pool overrides:
# DATABASE_POOL_MIN=0
# DATABASE_POOL_MAX=10
# DATABASE_IDLE_TIMEOUT_MS=10000
# DATABASE_CONNECTION_TIMEOUT_MS=5000
```

### Generate Migration

```bash
pnpm --filter @archon-treasury/database db:generate
```

### Run Migration

```bash
pnpm --filter @archon-treasury/database db:migrate
```

### Check Migration Status

```bash
pnpm --filter @archon-treasury/database db:check
```

### Run Database Studio (local only)

```bash
pnpm --filter @archon-treasury/database db:studio
```

## Testing

### Unit Tests (no database required)

```bash
pnpm --filter @archon-treasury/database test:unit
```

### Integration Tests (requires PostgreSQL)

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/archon_treasury_test" \
  pnpm --filter @archon-treasury/database test:integration
```

## Stop and Clean Up

```bash
cd infra/compose
docker compose down -v
```

⚠️ `-v` removes the named volume `pgdata`. Data is lost.

## Production Migration

Production migrations are **explicit commands only** — never auto-run on server import.

```bash
DATABASE_URL="postgresql://..." pnpm --filter @archon-treasury/database db:migrate
```

## Security

- Credentials never logged or exported in plaintext
- `DATABASE_URL` password is redacted in all structured output
- No automatic destructive reset
- No migration auto-run at server startup
- TLS required for production managed PostgreSQL
- No production secrets in Docker Compose or CI logs
