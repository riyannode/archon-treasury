# ADR-0011: Use Wallet and Route Provider Adapters

**Status:** Accepted  
**Date:** 2026-07-15

## Context

The system must support multiple custody modes (DCW, customer-managed, customer-hosted signer) and multiple route providers (CCTP, future bridges) without rewriting core domain logic.

## Decision

Define adapter interfaces for wallet custody (TreasuryWalletAdapter) and route providers (RouteProviderAdapter). Core domain logic depends only on interfaces. Concrete implementations are injected per environment.

## Consequences

- ✅ New custody modes added without changing proposal/approval domain
- ✅ New route providers added without changing approval engine
- ✅ Each adapter can be independently tested
- ⚠️ Interface design must be stable (breaking changes = multi-package update)
