# ADR-0004: PostgreSQL Is Source of Truth

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Financial systems require durable, consistent, auditable state. In-memory or cache-only state risks data loss and inconsistency.

## Decision

PostgreSQL is the authoritative source for all identity, policy, intent, proposal, approval, execution, audit, and reconciliation state. Redis is used only for caching, rate limiting, and ephemeral locks with durable fallback. Blockchain is external authoritative evidence.

## Consequences

- ✅ ACID guarantees for financial state
- ✅ Row-level security for tenant isolation
- ✅ Append-only audit with full history
- ⚠️ Requires managed PostgreSQL for production
- ⚠️ Schema migrations must be versioned and reviewed
