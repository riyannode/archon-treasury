# Incident Response

## Incident Types

### P0 — Critical

| Type | Detection | Response |
|------|-----------|----------|
| Duplicate value movement | Double audit event for same proposal | Emergency stop, manual investigation |
| Proposal/approval mismatch | Hash verification failure | Block execution, alert operator |
| DCW secret leak | Secret scanning alert | Rotate credentials immediately, audit access |
| Cross-tenant access | Authorization check failure | Block request, audit investigation |
| Mainnet execution while disabled | Emergency stop bypass | Kill execution, investigate |

### P1 — High

| Type | Detection | Response |
|------|-----------|----------|
| Burn confirmed, no progress | State stuck > expected duration | Resume recovery, investigate attestation |
| Repeated mint failures | >3 consecutive failures | Manual review, check destination chain |
| Audit write failure | Audit write error | Block high-risk mutations until resolved |
| DCW outage | Circle API errors | Queue operations, alert operator |
| Database outage | Connection errors | Activate read-only mode, alert |

### P2 — Medium

| Type | Detection | Response |
|------|-----------|----------|
| Hermes outage | Agent health check fails | Deterministic fallback, alert |
| x402 provider outage | Provider health check fails | Skip intelligence, continue without |
| Queue backlog | Pending jobs > threshold | Scale workers, investigate |
| CLI session expiry | Circle CLI auth error | Re-authenticate, update session |
| Low balance | Balance < threshold | Alert operator, pause operations |

## Runbook Template

1. Detect (monitoring alert or manual report)
2. Assess (which zone, which flow, which users affected)
3. Contain (emergency stop, block affected path)
4. Investigate (audit logs, execution state, blockchain evidence)
5. Remediate (fix root cause, restore service)
6. Recover (resume affected operations, verify)
7. Post-mortem (document, update runbook, add monitoring)
