# @archon-treasury/domain

Core domain primitives and database-independent repository contracts.

## Tenant and identity model

- `Organization` is the tenant root.
- `User` is a minimal identity containing a typed, normalized `UserEmail`; it has no password, session, JWT, OIDC, MFA, or provider state.
- A user may belong to multiple organizations.
- `OrganizationMember` binds one user to one organization role. The same user can have at most one membership in an organization.
- One organization may own multiple `Treasury` records. A treasury is a logical
  asset, policy, wallet-inventory, and operation pool; it does not store a
  blockchain balance, wallet address, or secret directly.

Personal use is represented by one user, one organization, and one treasury.
Team use adds organization members and may add more treasuries without changing
the tenant architecture.

## Treasury model

- Status is `active` or `suspended`; suspension only models state in this PR.
- Environment is `testnet` or `mainnet` metadata and is fixed at creation.
  Changing custody/network boundaries requires creating a separate treasury.
- Mainnet metadata does not enable wallet provisioning or mainnet execution.
- Names are bounded before trimming, normalized by trimming at the domain input
  boundary, and limited to 1–255 characters after trimming.
- Repository reads, lists, and updates are organization-scoped. The repository
  does not treat a supplied organization ID as authorization proof.

Initial roles correspond to Owner, Organization Admin, Treasury Operator, Treasury Approver, and Auditor. Permissions are explicit constants with an immutable role-to-permission map; there is no numeric role hierarchy.

Operational authorization requires an active user, active organization membership, and active organization. Invited, suspended, and removed memberships receive no operational permissions.

## Security boundary

RBAC answers only whether a principal may request an action. It is separate from future approval policy and does not implement proposal hashes, thresholds, quorum, self-approval rules, nonces, approval TTL, or proposal lifecycle.

Hermes and other agents cannot receive financial approval permission through this foundation. Treasury execution, Circle, CCTP, wallets, proposals, authentication, HTTP routes, frontend, MCP, and x402 remain outside this package change.

The future application layer must derive the organization from authenticated
principal context and check `treasury.create`, `treasury.read`, or
`treasury.update` before calling the repository. RBAC does not live in the
repository.
