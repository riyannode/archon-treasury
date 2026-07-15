# ADR-0010: Persist Bridge Recovery State

**Status:** Accepted  
**Date:** 2026-07-15

## Context

CCTP/App Kit bridges are multi-step (approve → burn → attestation → mint). Timeout after burn cannot restart from scratch without duplicating value movement.

## Decision

Every bridge step is persisted: approve state/txHash, burn state/txHash, attestation state/reference, mint state/txHash, error class, retryability, adapter version. Recovery resumes from the last confirmed step. Duplicate burn is explicitly blocked.

## Consequences

- ✅ Partial failures are recoverable
- ✅ No duplicate value movement on retry
- ✅ Ambiguous states route to MANUAL_REVIEW
- ⚠️ State machine must cover all step combinations
