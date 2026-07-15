# ADR-0003: Public MCP Maps to Application Commands

**Status:** Accepted  
**Date:** 2026-07-15

## Context

External customer agents need a protocol-native interface (MCP) but should not bypass application security boundaries.

## Decision

Public MCP tools map to the same application services used by the REST API and web app. No financial business logic lives exclusively in MCP tools. No execution path bypasses authentication, tenant authorization, policy, proposal, approval, execution state machine, or audit.

## Consequences

- ✅ Consistent security model across all interfaces
- ✅ Public MCP can be disabled without affecting web/API execution
- ✅ External agents get the same guarantees as human operators
- ⚠️ MCP tool count must be carefully scoped (read-heavy, write-safe only)
