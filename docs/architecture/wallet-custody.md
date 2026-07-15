# Wallet Custody Modes

## Mode A: Platform-Orchestrated DCW (MVP)

- Circle Developer-Controlled Wallet
- Archon execution worker owns API access
- Customer owns organization policy and approvals
- Secrets in managed secret store

## Mode B: Customer-Managed Wallet (Future)

- Customer uses supported external wallet/custodian
- Archon builds approved execution payload
- Customer signer or custodian executes
- Archon tracks status and reconciles

## Mode C: Customer-Hosted Signer (Future)

- Signer runs in customer environment
- Archon sends signed execution authorization request
- Customer service validates proposal hash
- Customer service signs or rejects

## Mode D: Read-Only Treasury (Future)

- Archon tracks addresses
- No execution
- Route recommendations and proposal export only

## Wallet Control Rule

No interface may expose:
- `executeRawTransaction(calldata)`
- `sendArbitraryTransaction(...)`
- `runWalletCommand(args)`
- `signAnyMessage(...)`

Application-level commands only:
- `executeApprovedBridge`
- `executeApprovedTransfer`
- `executeApprovedGatewayFunding`
- `executeApprovedRecovery`
- `getBalance`
- `getTransactionStatus`

## Wallet Lifecycle

```
REQUESTED → PROVISIONING → ACTIVE → SUSPENDED → DECOMMISSIONING → DECOMMISSIONED
                                  ↘ READ_ONLY
                                  ↘ ROTATING
                                  ↘ ERROR
```

Wallet deletion is not physical deletion. Records and audit lineage remain.
