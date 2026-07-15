# Bridge Recovery

## Problem

CCTP/App Kit bridges involve multiple steps:
1. Approve USDC spending
2. Burn USDC on source chain
3. Fetch attestation from Circle
4. Mint USDC on destination chain

If the process fails after burn (step 2), restarting from step 1 would burn duplicate funds.

## Recovery Strategy

### State Persistence

Every step is persisted with:
- Step name (APPROVE, BURN, ATTESTATION, MINT)
- Transaction hash (if applicable)
- Timestamp
- Error class (if failed)
- Retryability classification

### Resume Logic

```
if BURN not confirmed:
    resume from APPROVE
elif ATTESTATION not ready:
    poll attestation (no new transaction needed)
elif MINT not confirmed:
    retry mint (same attestation)
else:
    COMPLETED
```

### Duplicate Prevention

- Same execution lineage ID for all retry attempts
- Burn tx hash checked before any new burn
- Idempotency key per execution step

### Ambiguous States

If a step's status cannot be determined:
- Mark as RECOVERABLE
- Show current fund state to operator
- Create recovery proposal
- Route to MANUAL_REVIEW if needed

### Recovery Approval

Recovery of failed bridge operations may require re-approval depending on policy:
- `require_recovery_approval: true` — approver must confirm retry
- `require_recovery_approval: false` — automatic retry from persisted state
