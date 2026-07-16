// ── Domain Package ───────────────────────────────────────────────────────────
// Core domain primitives: value objects, typed identifiers, chain/asset keys.

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
// UserId, OrganizationId, etc. are exported as both types and values.
// The value exports (const) also expose the branded types.

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
