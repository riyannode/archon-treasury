# Architecture Overview

## System Context

Archon Treasury is a treasury control plane for crosschain USDC operations. It sits between human operators/customer agents and blockchain execution.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Human Web   │────▶│  Public API  │────▶│  Policy Engine  │
│  Application │     │  (REST)      │     │  + Proposal     │
└─────────────┘     └──────────────┘     │  + Approval     │
                                          └────────┬────────┘
┌─────────────┐     ┌──────────────┐              │
│  Customer    │────▶│  Public MCP  │──────────────┘
│  Agent       │     │  Gateway     │
└─────────────┘     └──────────────┘
                           │
┌─────────────┐     ┌──────┴───────┐     ┌─────────────────┐
│  Hermes     │────▶│  Private MCP │────▶│  Route Engine   │
│  Agent      │     │  Server      │     │  + Intelligence │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │  Execution      │
                                          │  Worker         │
                                          │  (DCW/CCTP)     │
                                          └─────────────────┘
```

## Security Zones

| Zone | Components | Access Rules |
|------|-----------|-------------|
| **Zone 1: Public Edge** | Web, Public API, Public MCP, Webhooks | Internet-facing, rate-limited |
| **Zone 2: Control Plane** | Domain, Policy, Proposal, Approval | No direct internet, no wallet creds |
| **Zone 3: Agent/Research** | Hermes, Private MCP, x402 Buyer | No wallet creds, no DCW, no shell |
| **Zone 4: Execution** | Execution Worker, DCW Credentials, Route Provider | Only reachable from Zone 2 |
| **Zone 5: Data** | Database, Object Storage, Secrets, Audit | Encrypted at rest, access-audited |

**Zone 4 cannot be reached directly from Zone 1 or Zone 3.**

## Money Flows

### Flow A: Agent Research (x402)
```
Hermes → MCP → x402 Purchase → Agent Wallet → Signed Report → Database
```

### Flow B: Treasury Execution
```
User Approve → API → Execution Worker → DCW → App Kit/CCTP → Arc → Receipt
```

**Hermes is NOT in Flow B.**

## Data Model (Core Tables)

See PRD Section 21 for full schema. Key entities:

- `organizations` — tenant root
- `users` — minimal identities that may belong to multiple organizations
- `organization_members` — organization-scoped role and membership status
- `treasuries` — logical asset pool
- `wallets` — DCW and agent wallet records
- `policies` — versioned policy rules
- `route_intents` — user transfer requests
- `route_candidates` — discovered routes
- `intelligence_purchases` — x402 payment records
- `route_proposals` — immutable, hash-bound proposals
- `approvals` — human approval records
- `executions` — bridge execution state
- `execution_steps` — per-step persistence
- `receipts` — final verifiable receipts
- `audit_events` — append-only audit trail

## State Machine

See `docs/architecture/execution-state-machine.md` for the full execution lifecycle from DRAFT through COMPLETED/FAILED/RECOVERABLE.

## Key Invariants

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
