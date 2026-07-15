# ADR-0001: Use Two-Wallet Model

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Archon Treasury needs separate wallets for agent research (x402 payments) and treasury execution (bridge operations). Combining them in one wallet creates unacceptable risk — an LLM or compromised agent could drain the treasury.

## Decision

Use two distinct wallet types:

1. **Agent Research Wallet** — Circle Agent Wallet via Circle CLI. Small balance, used for x402 payments, service purchases, and route intelligence.
2. **Treasury Execution Wallet** — Circle Developer-Controlled Wallet (DCW). Holds treasury USDC, executes approved bridge operations only.

## Consequences

- ✅ Agent cannot access treasury funds even if compromised
- ✅ Budget controls are per-wallet with independent limits
- ✅ Clear audit trail separating research spend from treasury movements
- ⚠️ Two wallet management surfaces to maintain
- ⚠️ Requires balance monitoring for both wallets

## Alternatives Considered

- Single wallet with logical budget partition — rejected: single key = single compromise vector
- Multi-sig for everything — rejected: too slow for agent research, overkill for small x402 payments
