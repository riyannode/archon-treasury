// ── Asset Identifier ─────────────────────────────────────────────────────────
// Typed values for supported blockchain assets.
// Rejects unsupported assets, immutable typed value.

export const SUPPORTED_ASSETS = {
  USDC: "USDC",
} as const;

export type AssetId = (typeof SUPPORTED_ASSETS)[keyof typeof SUPPORTED_ASSETS];

const SUPPORTED_ASSET_SET = new Set<string>(
  Object.values(SUPPORTED_ASSETS),
);

/**
 * Parse a string into an AssetId.
 * @throws if the asset is not supported.
 */
export function parseAssetId(value: string): AssetId {
  if (!SUPPORTED_ASSET_SET.has(value)) {
    throw new Error(
      `Unsupported AssetId: "${value}". Supported: ${Object.values(SUPPORTED_ASSETS).join(", ")}`,
    );
  }
  return value as AssetId;
}

/**
 * Safe parse — returns null on unsupported asset.
 */
export function safeParseAssetId(value: string): AssetId | null {
  if (!SUPPORTED_ASSET_SET.has(value)) {
    return null;
  }
  return value as AssetId;
}

/**
 * Check if a value is a valid AssetId.
 */
export function isAssetId(value: unknown): value is AssetId {
  return typeof value === "string" && SUPPORTED_ASSET_SET.has(value);
}

/**
 * List all supported asset IDs.
 */
export function supportedAssets(): readonly AssetId[] {
  return Object.values(SUPPORTED_ASSETS);
}
