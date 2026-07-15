# ADR-0002: Hermes Cannot Execute Treasury Operations

**Status:** Accepted  
**Date:** 2026-07-15

## Context

LLMs can misread amounts, chains, quotes, and recipient addresses. They are susceptible to prompt injection from service responses. Giving an LLM direct execution capability over financial operations creates unacceptable risk.

## Decision

Hermes (the LLM agent) is limited to:
- Reading treasury state
- Researching routes
- Purchasing intelligence (via Agent Wallet)
- Generating recommendations
- Creating proposals

Hermes CANNOT:
- Execute bridge operations
- Approve proposals
- Call DCW directly
- Build arbitrary calldata
- Access private keys or entity secrets
- Modify proposals after approval

All financial execution goes through: policy evaluation → human approval → execution worker → DCW/CCTP.

## Consequences

- ✅ LLM prompt injection cannot cause fund movement
- ✅ Separation of reasoning from authorization
- ✅ Hermes can be replaced without touching financial domain
- ⚠️ Requires deterministic fallback when Hermes is unavailable
