# ADR-0009: Route Scoring Is Deterministic

**Status:** Accepted  
**Date:** 2026-07-15

## Context

Financial routing decisions must be reproducible, auditable, and not subject to LLM temperature or random state.

## Decision

Route scoring uses fixed-weight dimensions (safety, amount, time, fee certainty, recovery) with integer/fixed-point math. Algorithm version is stored with every score. Multiple profiles (SAFETY, BALANCED, SPEED, COST) define different weight distributions.

## Consequences

- ✅ Same inputs always produce same score
- ✅ Score components are auditable
- ✅ Algorithm can be versioned and upgraded
- ⚠️ Weight tuning requires code change + ADR
