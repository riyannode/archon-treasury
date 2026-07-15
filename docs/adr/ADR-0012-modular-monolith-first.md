# ADR-0012: Start with Modular Monolith

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Premature microservice decomposition adds operational complexity without benefit. The team and traffic don't warrant separate services yet.

## Decision

Start with a modular monolith: public API, domain services, policy, route engine, proposal, approval in one deployable. Separate from day one: execution worker, Hermes, private MCP, public MCP, route health x402 provider (different security boundaries or independent failure domains).

Split module into service only when: different security boundary, secrets isolation, independent scaling, independent failure domain, independent deployment required, language/runtime requirement, or regulatory boundary.

## Consequences

- ✅ Simpler development and deployment for MVP
- ✅ Shared types and transactions within the monolith
- ⚠️ Must enforce module boundaries within the monolith to enable future split
