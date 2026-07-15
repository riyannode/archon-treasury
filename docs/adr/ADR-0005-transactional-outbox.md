# ADR-0005: Use Transactional Outbox

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Domain events must be published after database commit, not before. Publishing before commit risks consumers processing events for transactions that roll back.

## Decision

Use the transactional outbox pattern:
1. Write domain state and outbox event in the same database transaction
2. Dispatcher publishes events after commit
3. Consumer handles idempotently
4. Mark delivery status

MVP uses database outbox + durable queue. Future: managed event bus when scale requires.

## Consequences

- ✅ Event publication is consistent with database state
- ✅ No lost events on application crash
- ⚠️ Dispatcher polling adds latency (acceptable for MVP)
