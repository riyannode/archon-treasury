# @archon-treasury/database

> PostgreSQL database client, health checks, transaction helpers, and migration tooling for Archon Treasury.

## Status

Phase 0 — Foundation. No business tables yet. Baseline migration committed.

## Architecture

```
packages/database/
├── src/
│   ├── config.ts          # Database config validation (Zod) — explicit input only
│   ├── client.ts          # Connection pool singleton (Drizzle + pg) + SSL config
│   ├── health.ts          # SELECT 1 with SET LOCAL statement_timeout
│   ├── transaction.ts     # Typed transaction boundaries (commit/rollback)
│   ├── schema/
│   │   └── index.ts       # Schema export boundary (empty — no business tables)
│   ├── index.ts           # Public API barrel
│   └── *.test.ts          # Unit + integration tests
├── migrations/            # Drizzle-generated SQL (committed to Git)
│   ├── 0000_initial.sql   # Baseline migration (no business tables)
│   └── meta/
│       ├── _journal.json  # Migration journal
│       └── 0000_snapshot.json
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
- **TLS:** `DATABASE_SSL_MODE` — `"disable"` (default) or `"require"`

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

# TLS (default: disable for local)
# DATABASE_SSL_MODE="disable"
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

## TLS Configuration

| `DATABASE_SSL_MODE` | Behavior | Use case |
|---|---|---|
| `disable` (default) | No TLS | Local development, CI |
| `require` | Encrypted connection | Production managed PostgreSQL |

**Limitation:** `sslMode: "require"` uses `rejectUnauthorized: false` — the connection is encrypted but the server certificate is **not** verified. This is a known limitation of this foundation PR. Production-grade verified TLS (with CA certificate pinning) requires additional configuration that is out of scope for Phase 0. Do NOT claim production-grade TLS verification until that configuration is implemented.

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
- TLS configurable for production via `DATABASE_SSL_MODE`
- No production secrets in Docker Compose or CI logs
- Database config accepts only explicit input — no ambient `process.env` reads
