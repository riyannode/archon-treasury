# Archon Treasury

**Policy, intelligence, approval, and execution control plane for crosschain USDC treasury operations.**

[![CI](https://github.com/riyannode/archon-treasury/actions/workflows/ci.yml/badge.svg)](https://github.com/riyannode/archon-treasury/actions/workflows/ci.yml)

---

## Current Implementation

Working monorepo with runnable TypeScript workspaces:

| Workspace | Package | Status |
|-----------|---------|--------|
| `apps/api` | `@archon-treasury/api` | ✅ Minimal HTTP server scaffold |
| `packages/config` | `@archon-treasury/config` | ✅ Environment config loader |
| `packages/domain` | `@archon-treasury/domain` | ✅ Money value object (USDC) |
| `packages/observability` | `@archon-treasury/observability` | ✅ Structured JSON logger |

**Infrastructure:**
- pnpm workspace monorepo (Node.js ≥22, pnpm ≥9)
- Shared TypeScript config (`tsconfig.base.json`)
- ESLint flat config with `@typescript-eslint`
- Vitest test runner (10 tests across 4 files)
- GitHub Actions CI (lint → typecheck → test → build)
- Docker Compose (PostgreSQL + Redis)

**Commands:**
```bash
pnpm install        # install all dependencies
pnpm typecheck      # type-check all workspaces
pnpm lint           # lint all files
pnpm test           # run all tests
```

## Docker

The API server exposes port **3000** by default (configurable via `PORT` env var).

```bash
# Start PostgreSQL + Redis + API
docker compose -f infra/compose/docker-compose.yml up -d

# API is available at http://localhost:3000
# Health check: curl http://localhost:3000

# Override port (e.g. for local dev on 4000)
PORT=4000 docker compose -f infra/compose/docker-compose.yml up api
```

## Planned MVP (Stage 1 — Production-Ready Testnet)

Scope: internal users, web app, private API, private MCP, Hermes, Agent Wallet x402, DCW treasury, Circle CCTP/App Kit, Arc Testnet, manual approval, audit, recovery.

| Workspace | Description |
|-----------|-------------|
| `apps/web` | Next.js web application (dashboard, proposals, approvals) |
| `apps/api` | REST API server (organizations, treasuries, routes, proposals) |
| `services/mcp` | Private MCP server for Hermes Agent |
| `services/route-worker` | Route discovery & ranking |
| `services/execution-worker` | DCW bridge execution |
| `packages/domain` | Entities, value objects, state machines |
| `packages/database` | Schema, migrations, repositories |
| `packages/auth` | RBAC, permissions, OIDC |
| `packages/policy-engine` | Deterministic policy evaluation |
| `packages/route-engine` | Discovery, scoring, ranking |
| `packages/agent-orchestrator` | Hermes adapter interface |
| `packages/mcp-contracts` | Tool & result schemas |
| `packages/x402-client` | x402 payment client |
| `packages/agent-wallet-adapter` | Circle CLI wrapper |
| `packages/dcw-wallet-adapter` | DCW SDK wrapper |
| `packages/bridge-adapter` | CCTP/App Kit wrapper |

## Future Architecture (Stage 2–6)

Platform evolution toward multi-tenant SaaS with public agent platform:

```
Edge:          Web → Public API → Public MCP → Webhooks
Control Plane: Identity → Policy → Proposal → Approval
Agent:         Hermes → Private MCP → Intelligence
Execution:     Coordinator → Wallet Adapters → Route Providers
Platform:      Audit → Notifications → Events → Observability
```

**Key future capabilities:**
- External customer agents via public scoped MCP
- Multiple wallet custody modes (DCW, customer-managed, customer-hosted signer)
- Multiple route providers
- Standing authorization for constrained automation
- Reconciliation and verifiable receipts
- Programmatic treasury automation

## Documentation

| Document | Path |
|----------|------|
| Product PRD | [docs/product/archon-treasury-prd.txt](docs/product/archon-treasury-prd.txt) |
| Architecture Overview | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Security Boundaries | [docs/architecture/security-boundaries.md](docs/architecture/security-boundaries.md) |
| Execution State Machine | [docs/architecture/execution-state-machine.md](docs/architecture/execution-state-machine.md) |
| Wallet Custody Modes | [docs/architecture/wallet-custody.md](docs/architecture/wallet-custody.md) |
| Provider Adapters | [docs/architecture/provider-adapters.md](docs/architecture/provider-adapters.md) |
| Bridge Recovery | [docs/architecture/bridge-recovery.md](docs/architecture/bridge-recovery.md) |
| MCP Tools | [docs/mcp/tools.md](docs/mcp/tools.md) |
| x402 Payment Safety | [docs/security/x402-payment-safety.md](docs/security/x402-payment-safety.md) |
| ADRs (0001–0015) | [docs/adr/](docs/adr/) |
| Incident Response | [docs/runbooks/incident-response.md](docs/runbooks/incident-response.md) |
| Mainnet Launch | [docs/operations/mainnet-launch.md](docs/operations/mainnet-launch.md) |

## Development

See [AGENTS.md](AGENTS.md) for coding agent rules, non-negotiable invariants, and PR guidelines.

## License

Proprietary — All rights reserved.
