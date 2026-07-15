# ADR-0008: No Arbitrary Wallet Operation API

**Status:** Accepted  
**Date:** 2026-07-15

## Context

An `executeRawTransaction(calldata)` or `sendArbitraryTransaction(...)` API would allow any authenticated caller to move funds without policy evaluation or approval.

## Decision

No interface exposes arbitrary transaction execution. All wallet operations are application-level commands: executeApprovedBridge, executeApprovedTransfer, executeApprovedGatewayFunding, executeApprovedRecovery. Each requires a valid, approved, unexpired proposal.

## Consequences

- ✅ Every financial movement is policy-evaluated and approved
- ✅ No bypass path exists through any interface
- ⚠️ New operation types require new approved commands (by design)
