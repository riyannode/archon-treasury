// ── Chain Key ────────────────────────────────────────────────────────────────
// Typed enum-like values for supported blockchain chains.
// Rejects unsupported chains, does not accept arbitrary strings.
// Easily extensible by adding to the SUPPORTED_CHAINS map.

export const SUPPORTED_CHAINS = {
  ETHEREUM_SEPOLIA: "ETHEREUM_SEPOLIA",
  BASE_SEPOLIA: "BASE_SEPOLIA",
  OP_SEPOLIA: "OP_SEPOLIA",
  ARC_TESTNET: "ARC_TESTNET",
} as const;

export type ChainKey = (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

const SUPPORTED_CHAIN_SET = new Set<string>(
  Object.values(SUPPORTED_CHAINS),
);

/**
 * Parse a string into a ChainKey.
 * @throws if the chain is not supported.
 */
export function parseChainKey(value: string): ChainKey {
  if (!SUPPORTED_CHAIN_SET.has(value)) {
    throw new Error(
      `Unsupported ChainKey: "${value}". Supported: ${Object.values(SUPPORTED_CHAINS).join(", ")}`,
    );
  }
  return value as ChainKey;
}

/**
 * Safe parse — returns null on unsupported chain.
 */
export function safeParseChainKey(value: string): ChainKey | null {
  if (!SUPPORTED_CHAIN_SET.has(value)) {
    return null;
  }
  return value as ChainKey;
}

/**
 * Check if a value is a valid ChainKey.
 */
export function isChainKey(value: unknown): value is ChainKey {
  return typeof value === "string" && SUPPORTED_CHAIN_SET.has(value);
}

/**
 * List all supported chain keys.
 */
export function supportedChains(): readonly ChainKey[] {
  return Object.values(SUPPORTED_CHAINS);
}
