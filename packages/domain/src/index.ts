// ── Domain Package ───────────────────────────────────────────────────────────
// Core domain primitives: value objects, typed identifiers, chain/asset keys,
// organization entity, repository contracts, and domain errors.

// Money value object (USDC atomic representation)
export type AtomicAmount = string;

export interface Money {
  readonly amount: AtomicAmount;
  readonly decimals: number;
  readonly asset: string;
}

const USDC_DECIMALS = 6;

export function createUsdcMoney(humanAmount: number): Money {
  const atomic = Math.floor(humanAmount * 10 ** USDC_DECIMALS).toString();
  return { amount: atomic, decimals: USDC_DECIMALS, asset: "USDC" };
}

export function toHumanUsdc(money: Money): number {
  return Number(money.amount) / 10 ** money.decimals;
}

export function formatUsdc(money: Money): string {
  return `${toHumanUsdc(money)} ${money.asset}`;
}

// ── Typed Identifiers ──────────────────────────────────────────────────────

export type { Brand } from "./identifiers.js";
export {
  UserId,
  OrganizationId,
  TreasuryId,
  WalletId,
} from "./identifiers.js";

// ── Chain Key ─────────────────────────────────────────────────────────────

export type { ChainKey } from "./chain.js";
export {
  KNOWN_CHAIN_KEYS,
  parseChainKey,
  safeParseChainKey,
  isChainKey,
  knownChainKeys,
} from "./chain.js";

// ── Asset Identifier ──────────────────────────────────────────────────────

export type { AssetId } from "./asset.js";
export {
  SUPPORTED_ASSETS,
  parseAssetId,
  safeParseAssetId,
  isAssetId,
  supportedAssets,
} from "./asset.js";

// ── Address Value Object ──────────────────────────────────────────────────

export type { Address } from "./address.js";
export {
  createAddress,
  safeCreateAddress,
  addressesEqual,
  serializeAddress,
} from "./address.js";

// ── Organization Domain ───────────────────────────────────────────────────

// Organization entity, status, and mutation helpers
export type { Organization } from "./organization.js";
export {
  OrganizationStatus,
  isValidOrganizationStatus,
  validateOrganizationStatus,
  createOrganization,
  renameOrganization,
  changeOrganizationSlug,
  suspendOrganization,
  activateOrganization,
  validateOrganizationName,
  isValidOrganizationName,
} from "./organization.js";
export type {
  CreateOrganizationInput as CreateOrganizationEntityInput,
} from "./organization.js";

// OrganizationSlug value object
export {
  OrganizationSlug,
  normalizeSlug,
} from "./organization-slug.js";

// Domain errors
export {
  DomainError,
  NotFoundError,
  ConflictError,
  ValidationError,
  DataIntegrityError,
  organizationNotFoundError,
  organizationSlugConflictError,
  invalidOrganizationNameError,
  invalidOrganizationSlugError,
  invalidOrganizationStatusTransitionError,
  emptyUpdateError,
  organizationPersistenceError,
} from "./errors.js";

// Repository interface
export type {
  OrganizationRepository,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "./organization-repository.js";
