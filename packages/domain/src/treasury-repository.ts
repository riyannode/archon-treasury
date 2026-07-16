import type { OrganizationId, TreasuryId } from "./identifiers.js";
import type {
  Treasury,
  TreasuryEnvironment,
  TreasuryStatus,
} from "./treasury.js";

export interface CreateTreasuryInput {
  readonly id: TreasuryId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly environment: TreasuryEnvironment;
}

export interface UpdateTreasuryInput {
  readonly id: TreasuryId;
  readonly organizationId: OrganizationId;
  readonly name?: string;
  readonly status?: TreasuryStatus;
}

/**
 * Organization-scoped persistence contract. The application layer must derive
 * organizationId from authenticated principal context and enforce
 * treasury.create, treasury.read, or treasury.update before invoking it.
 */
export interface TreasuryRepository {
  create(input: CreateTreasuryInput): Promise<Treasury>;
  findById(
    organizationId: OrganizationId,
    treasuryId: TreasuryId,
  ): Promise<Treasury | null>;
  listByOrganization(
    organizationId: OrganizationId,
  ): Promise<readonly Treasury[]>;
  update(input: UpdateTreasuryInput): Promise<Treasury>;
}
