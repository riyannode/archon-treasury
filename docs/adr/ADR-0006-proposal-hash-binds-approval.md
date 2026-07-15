# ADR-0006: Proposal Hash Binds Approval

**Status:** Accepted  
**Date:** 2026-07-15

## Context

An approved proposal must not be modified between approval and execution. Without binding, an attacker could change proposal fields after approval.

## Decision

The proposal hash includes all material fields: version, org, treasury, intent, wallet, address, recipient, chains, asset, amount, speed, fee, candidate, estimate, policy, expiry, adapter version. Approval is bound to this exact hash. Any material change requires a new proposal.

## Consequences

- ✅ Approved proposals are immutable
- ✅ Tampering is detected by hash mismatch
- ✅ Approval replay is prevented by nonce + TTL
- ⚠️ Quote expiry may require proposal refresh (new hash, re-approval)
