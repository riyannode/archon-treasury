# ADR-0007: Execution Worker Owns DCW Credentials

**Status:** Accepted  
**Date:** 2026-07-15

## Context

DCW credentials (API key, entity secret) are the most sensitive material in the system. They must be isolated to the smallest possible attack surface.

## Decision

Only the execution worker service has access to DCW credentials via managed secret store. No other service, agent, MCP tool, or web frontend can access DCW operations directly. The execution worker exposes only high-level operations: executeApprovedBridge, executeApprovedTransfer, getBalance, getTransactionStatus.

## Consequences

- ✅ Smallest possible credential exposure surface
- ✅ No secret leakage through agent, MCP, or web
- ✅ Credential rotation affects only execution worker
- ⚠️ All execution must go through the worker (no direct SDK calls elsewhere)
