# Archon Treasury

**Policy, intelligence, approval, and execution control plane for crosschain USDC treasury operations.**

[![CI](https://github.com/riyannode/archon-treasury/actions/workflows/ci.yml/badge.svg)](https://github.com/riyannode/archon-treasury/actions/workflows/ci.yml)

---

## Overview

Archon Treasury enables organizations to safely route treasury USDC across chains with agent-assisted research and human-approved execution.

### Core Principles

1. **Agent reasoning ≠ financial authorization** — LLM cannot execute treasury moves
2. **Two-wallet separation** — Agent Wallet (research/x402) ≠ DCW (treasury execution)
3. **Paid intelligence** — x402 per-request payment for route health, risk, fees
4. **Immutable proposals** — Hash-bound, expiring, approval-gated
5. **Recovery-first** — Every bridge step persisted, partial failures resumable
6. **Audit-first** — Every financial transition logged with full lineage

## Architecture

```
Browser → Next.js Web → Archon Treasury API
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         PostgreSQL      Durable Queue     Hermes Agent
                              │               │
              ┌───────┬───────┤         Private MCP
              │       │       │
         Route    Execution  Indexer
         Worker   Worker
              │       │       │
        Circle CLI  DCW/App  RPC/Circle
        Agent W.    Kit      Status
```

## Monorepo Structure

```
archon-treasury/
├── apps/
│   ├── web/                    # Next.js web application
│   └── api/                    # REST API server
├── services/
│   ├── hermes-gateway/         # Hermes Agent configuration
│   ├── mcp/                    # Private MCP server
│   ├── route-worker/           # Route discovery & ranking
│   ├── execution-worker/       # DCW bridge execution
│   ├── indexer/                # Blockchain & RPC monitoring
│   ├── route-health-provider/  # x402 route health service
│   └── public-mcp-gateway/     # External agent MCP interface
├── packages/
│   ├── domain/                 # Entities, value objects, state machines
│   ├── database/               # Schema, migrations, repositories
│   ├── auth/                   # RBAC, permissions, OIDC
│   ├── policy-engine/          # Deterministic policy evaluation
│   ├── route-engine/           # Discovery, scoring, ranking
│   ├── agent-orchestrator/     # Hermes adapter interface
│   ├── mcp-contracts/          # Tool & result schemas
│   ├── x402-client/            # x402 payment client
│   ├── x402-provider/          # x402 seller middleware
│   ├── agent-wallet-adapter/   # Circle CLI wrapper
│   ├── dcw-wallet-adapter/     # DCW SDK wrapper
│   ├── bridge-adapter/         # CCTP/App Kit wrapper
│   ├── provider-registry/      # x402 provider management
│   ├── chain-registry/         # Chain configuration
│   ├── circle-tools/           # Circle CLI async runner
│   ├── observability/          # Logging, tracing, metrics
│   ├── config/                 # Environment schema
│   └── ui/                     # Shared UI components
├── infra/                      # Docker, K8s, Terraform
├── docs/                       # Architecture, ADRs, runbooks
└── tests/                      # Unit, integration, E2E, security
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run database migrations
pnpm db:migrate

# Start development
pnpm dev
```

## Documentation

- [Product PRD](docs/product/archon-treasury-prd.txt)
- [Architecture Overview](docs/architecture/overview.md)
- [Security Boundaries](docs/architecture/security-boundaries.md)
- [MCP Tools](docs/mcp/tools.md)
- [x402 Payment Safety](docs/security/x402-payment-safety.md)
- [Bridge Recovery](docs/architecture/bridge-recovery.md)
- [Incident Response](docs/runbooks/incident-response.md)
- [Mainnet Launch](docs/operations/mainnet-launch.md)

## Development

See [AGENTS.md](AGENTS.md) for coding agent rules and PR guidelines.

## License

Proprietary — All rights reserved.
