# Security Boundaries

## Trust Zones

### Zone 1: Public Edge
- Web application (Next.js)
- Public API gateway
- Public MCP gateway
- Webhook gateway

**Rules:**
- Rate limited
- CSRF protected
- No wallet secrets
- No DCW operations
- No private MCP access

### Zone 2: Application Control Plane
- Domain services
- Policy engine
- Proposal engine
- Approval engine

**Rules:**
- No wallet credentials
- No direct chain RPC for authoritative state
- No agent bypass of policy
- Tenant authorization enforced

### Zone 3: Agent/Research
- Hermes Agent
- Private MCP server
- x402 buyer

**Rules:**
- No DCW access
- No shell execution
- No arbitrary HTTP
- No arbitrary SQL
- Scoped MCP tools only
- Budget caps enforced

### Zone 4: Execution
- Execution worker
- DCW credentials (managed secret store)
- Route provider execution

**Rules:**
- Only reachable from Zone 2
- Egress allowlisted (Circle APIs, RPCs, approved providers)
- No inbound from Zone 1 or Zone 3
- All mutations require valid, approved proposal

### Zone 5: Data
- PostgreSQL database
- Object storage
- Secret manager
- Audit signing keys

**Rules:**
- Encrypted at rest
- Access audited
- No secrets in plaintext
- No secrets in CI logs
- Separate environment configs

## Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Circle API Key | Managed secret store | Execution worker only |
| Circle Entity Secret | Managed secret store | Execution worker only |
| Database URL | Managed secret store | API + workers |
| Auth Secret | Managed secret store | API |
| Hermes API Key | Managed secret store | MCP server only |
| x402 Payment Key | Managed secret store | Agent wallet adapter |

**Never:**
- Store secrets in database plaintext
- Send secrets to browser
- Send secrets to agent/MCP
- Log secrets
- Put secrets in CI/CD logs
- Put secrets in repository

## Egress Allowlist

### Execution Worker
- Circle APIs (api.circle.com)
- Required RPC endpoints (per chain config)
- Approved x402 provider endpoints
- Telemetry (OTLP)

### Private/Public MCP
- Preferably none
- All provider access through application service

## Incident Response

See `docs/runbooks/incident-response.md` for:
- Unauthorized intent
- Unauthorized approval
- Duplicate execution
- Secret exposure
- Provider compromise
- Agent prompt injection
- x402 budget drain
- Reconciliation mismatch
- Stuck burn/mint
- Cross-tenant data exposure
