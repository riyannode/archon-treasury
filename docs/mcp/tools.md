# MCP Tools — Archon Treasury

## Private MCP (Internal Hermes)

### Read Tools
- `get_treasury_state` — current balances, wallet status, active policies
- `get_treasury_policy` — active policy rules
- `get_route_intent` — confirmed intent details
- `get_route_proposal` — proposal details and status
- `get_execution_status` — execution timeline and current step

### Research Tools
- `discover_route_candidates` — find available routes for intent
- `purchase_route_intelligence` — buy x402 route health report
- `simulate_route_candidates` — simulate without execution
- `get_ranked_route_candidates` — scored and ranked candidates

### Write Tools (Limited)
- `create_route_proposal` — create immutable proposal from recommendation

### Forbidden Tools
- `approve_proposal`
- `execute_proposal`
- `retry_bridge`
- `update_policy`
- `create_dcw_wallet`
- `run_circle_cli`
- `circle_wallet_transfer`
- `circle_bridge_transfer`
- `circle_gateway_deposit`
- `arbitrary_http`
- `shell`
- `filesystem write`

## Public MCP (External Agents)

See PRD Section 45.5 for the full list of provided and forbidden tools.

## Tool Token Binding

Every MCP tool call is bound to:
- Task ID
- Organization ID
- Treasury ID
- Scopes
- Expiry
- Trace ID
