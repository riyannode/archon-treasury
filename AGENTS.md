# AGENTS.md — Archon Treasury

## Before Coding

1. Read `docs/product/archon-treasury-prd.txt` (full PRD)
2. Read relevant ADR from `docs/adr/`
3. Read the package README in the directory you're modifying
4. Inspect existing interfaces and types
5. Identify which security zone you're touching
6. State which files you expect to change
7. Avoid unrelated refactor

## PR Rules

- **One coherent behavior per PR** — no mixed architecture + feature
- **Under 500 changed lines** (excluding generated lock/migration)
- **One database migration per domain change**
- **One primary acceptance criterion**
- **Never push with type errors** — run `pnpm typecheck` first
- **Never bypass policy/approval** for testnet shortcuts
- **Never expose raw wallet/CLI** in agent tools
- **Never add mocks to deployed financial path**

## Non-Negotiable Invariants

1. Agent reasoning ≠ financial authorization
2. Approved proposal fields cannot change during execution
3. No financial side effect without idempotency strategy
4. No retry when side-effect state is ambiguous
5. No completion without external evidence
6. No financial state without audit
7. No cross-tenant access
8. No secret in browser, agent, MCP result, log, or database plaintext
9. No arbitrary CLI, HTTP, SQL, signing, or transaction tool exposed to agent
10. Mock is prohibited in deployed financial path
11. Public MCP is an adapter, not an alternate backend
12. Execution worker is the only component with treasury execution credentials
13. Policy is deterministic and versioned
14. Human approval is explicit unless constrained standing authorization applies
15. Recovery cannot create duplicate value movement

## Prohibited Shortcuts

- fake provider
- hardcoded success
- TODO in financial safety path
- arbitrary `any`
- disabling typecheck
- swallowing error
- direct database access from UI
- direct wallet access from MCP
- using floating point for amount
- bypassing policy for testnet
- adding raw CLI command
- adding generic execute transaction endpoint
- using in-memory state for execution
- marking completed from submitted transaction
- automatic retry after ambiguous mutation
- exposing stack trace to public client
- logging secret
- expanding tool scope without ADR/security review

## Required PR Description

- Problem
- Scope
- Non-scope
- Architecture section affected
- Security impact
- Database impact
- API/MCP contract impact
- Migration
- Tests
- Rollback
- Acceptance criteria

## Stop Condition

Stop and create an ADR instead of guessing when:
- Custody semantics unclear
- Provider side effect cannot be classified
- Proposal fields need material change
- Retry safety unknown
- Tenant ownership unclear
- Secret location unclear
- Chain/provider support undocumented

## Git Conventions

```
type(scope): short description

Types: feat, fix, refactor, docs, test, ci, chore, perf
Author: Riyan <riyannode@users.noreply.github.com>
```
