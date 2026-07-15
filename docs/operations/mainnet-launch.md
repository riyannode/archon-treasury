# Mainnet Launch Guide

## Pre-Launch Checklist

### Security
- [ ] External security review completed
- [ ] All P0 acceptance criteria pass
- [ ] No critical findings open
- [ ] Secret rotation procedure tested
- [ ] Emergency stop drill passed

### Infrastructure
- [ ] Managed PostgreSQL provisioned and tested
- [ ] Backup automation verified
- [ ] Restore test passed
- [ ] Monitoring and alerting enabled
- [ ] On-call rotation established

### Product
- [ ] Transaction caps configured
- [ ] Daily caps configured
- [ ] Recipient allowlist populated
- [ ] Provider allowlist populated
- [ ] MFA enabled for all approvers
- [ ] Mainnet wallet separation verified

### Operational
- [ ] Runbooks reviewed and updated
- [ ] Incident response drill completed
- [ ] Support escalation path documented
- [ ] Customer communication plan ready

## Staged Rollout

1. **Internal testing** — Team wallets only
2. **Invited organizations** — 2-3 trusted organizations, small caps
3. **Expanded pilot** — More organizations, increased caps
4. **General availability** — Public signup, standard caps

## Rollback

If critical issue discovered:
1. Emergency stop all executions
2. Investigate scope of impact
3. Notify affected organizations
4. Fix and verify in staging
5. Resume with enhanced monitoring

## Monitoring

During launch week:
- 24/7 on-call coverage
- Hourly execution health checks
- Real-time duplicate execution alerts
- Balance reconciliation every 4 hours
- Audit trail completeness verification daily
