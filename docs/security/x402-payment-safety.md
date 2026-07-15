# x402 Payment Safety

## Payment Flow

1. Agent identifies need for intelligence (route health, risk report, etc.)
2. Agent calls `purchase_route_intelligence` MCP tool
3. Backend validates: provider in allowlist, amount within cap, task budget remaining
4. Backend calls x402 inspect on provider endpoint
5. If inspect passes, backend calls x402 pay
6. Payment receipt stored in `intelligence_purchases` table
7. Report content validated against schema
8. Report stored and hash recorded

## Safety Rules

- **Max amount per call** — configured in policy, enforced by backend
- **Max per task** — task-level budget cap
- **Daily budget** — organization-level daily spend limit
- **Provider allowlist** — only registered providers accepted
- **No unsafe retry** — if payment state is ambiguous, do NOT retry
- **Request/response hash** — every purchase records both hashes
- **Response size limit** — prevent memory exhaustion from large reports

## Paid-but-Failed

If x402 payment succeeds but service returns error/invalid data:
- Payment is NOT refunded automatically
- Error is logged with full context
- Budget is NOT re-credited
- User may investigate via audit trail

**No automatic repayment after ambiguous submission.**

## Agent Research Budget Layers

```
per tool call → per provider → per task → per treasury → per organization → daily → monthly
```

Budget exhaustion returns structured error. Deterministic route engine continues without optional data if policy permits.
