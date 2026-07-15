# ADR-0015: Mock Prohibited in Deployed Financial Path

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Mocks in production create false confidence. A system that passes tests with mocks may fail catastrophically with real integrations.

## Decision

Mocks are ONLY allowed in unit tests and isolated CI tests. Production, staging, and testnet deployments must use real integrations: real Circle CLI, real DCW SDK, real CCTP/App Kit, real blockchain RPC, real x402 payments.

Forbidden in deployed flows:
- setTimeout as bridge completion
- Random risk scores
- Hardcoded balances
- Fake provider responses
- Static route prices presented as live
- Fabricated transaction hashes
- Swallowing errors and returning success
- Marking completed from Hermes text output

## Consequences

- ✅ Tests validate real integration behavior
- ✅ No false confidence from mock-passing tests
- ⚠️ Requires testnet faucet USDC for testing
- ⚠️ Real network latency in integration tests
