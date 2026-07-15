# Route Provider Adapters

## Interface

```typescript
interface RouteProviderAdapter {
  getCapabilities(): Promise<ProviderCapabilities>;
  estimate(input: EstimateInput): Promise<RouteEstimate[]>;
  simulate(input: SimulationInput): Promise<SimulationResult>;
  execute(input: ApprovedExecutionPlan): Promise<ExecutionStartResult>;
  inspect(input: ProviderInspectionInput): Promise<ProviderExecutionState>;
  recover(input: RecoveryInput): Promise<RecoveryResult>;
  healthCheck(): Promise<ProviderHealth>;
}
```

## Capabilities

- Supported assets
- Source chains
- Destination chains
- Min/max amount
- Settlement modes
- Custody requirements
- Fee model
- Recovery support
- Idempotency support
- Compliance capabilities
- Expected confirmation model

## MVP Provider

Circle CCTP/App Kit is the only MVP provider. FAST and Standard may be separate candidates when both are real.

## Provider Registration

Provider registration is administrative. Agent cannot register a provider.

Provider states: PENDING → TESTING → ACTIVE → DEGRADED → SUSPENDED → REMOVED
