# ADR-0013: External Agent Identity Separate from Human User

**Status:** Accepted  
**Date:** 2026-07-15

## Context

External customer agents should not inherit all permissions from the human who registered them. An agent needs scoped, revocable authorization.

## Decision

Agent identity is a first-class principal type (EXTERNAL_AGENT) with its own record: organization owner, allowed treasuries, allowed tools, allowed scopes, budget cap, task duration limit, environment, status. Agent authorization does not inherit from the registering human's full permissions.

## Consequences

- ✅ Least-privilege for external agents
- ✅ Agent can be disabled without affecting human user
- ✅ Budget and scope limits are per-agent
- ⚠️ Requires agent management UI and lifecycle
