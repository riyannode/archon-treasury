# @archon-treasury/domain

Core domain primitives and database-independent repository contracts.

## Tenant and identity model

- `Organization` is the tenant root.
- `User` is a minimal identity containing a typed, normalized `UserEmail`; it has no password, session, JWT, OIDC, MFA, or provider state.
- A user may belong to multiple organizations.
- `OrganizationMember` binds one user to one organization role. The same user can have at most one membership in an organization.

Initial roles correspond to Owner, Organization Admin, Treasury Operator, Treasury Approver, and Auditor. Permissions are explicit constants with an immutable role-to-permission map; there is no numeric role hierarchy.

Operational authorization requires an active user, active organization membership, and active organization. Invited, suspended, and removed memberships receive no operational permissions.

## Security boundary

RBAC answers only whether a principal may request an action. It is separate from future approval policy and does not implement proposal hashes, thresholds, quorum, self-approval rules, nonces, approval TTL, or proposal lifecycle.

Hermes and other agents cannot receive financial approval permission through this foundation. Treasury execution, Circle, CCTP, wallets, proposals, authentication, HTTP routes, frontend, MCP, and x402 remain outside this package change.
