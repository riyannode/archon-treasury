// ── Chain Key ────────────────────────────────────────────────────────────────
// Known chain keys in the domain model.
// "Known" means the key is valid for identification and routing logic.
// It does NOT imply that RPC, Circle, bridge, route, or provider support
// is available — operational capability is determined later by the
// chain/provider registry.
//
// Easily extensible by adding to the KNOWN_CHAIN_KEYS map.

export const KNOWN_CHAIN_KEYS = {
  ETHEREUM_SEPOLIA: "ETHEREUM_SEPOLIA",
  BASE_SEPOLIA: "BASE_SEPOLIA",
  OP_SEPOLIA: "OP_SEPOLIA",
  ARC_TESTNET: "ARC_TESTNET",
} as const;

export type ChainKey = (typeof KNOWN_CHAIN_KEYS)[keyof typeof KNOWN_CHAIN_KEYS];

const KNOWN_CHAIN_KEY_SET = new Set<string>(
  Object.values(KNOWN_CHAIN_KEYS),
);

/**
 * Parse a string into a ChainKey.
 * @throws if the chain key is not in the known set.
 */
export function parseChainKey(value: string): ChainKey {
  if (!KNOWN_CHAIN_KEY_SET.has(value)) {
    throw new Error(
      `Unknown ChainKey: \"${value}\". Known: ${Object.values(KNOWN_CHAIN_KEYS).join(", ")}`,
    );
  }
  return value as ChainKey;
}

/**
 * Safe parse — returns null on unknown chain key.
 */
export function safeParseChainKey(value: string): ChainKey | null {
  if (!KNOWN_CHAIN_KEY_SET.has(value)) {
    return null;
  }
  return value as ChainKey;
}

/**
 * Check if a value is a known ChainKey.
 */
export function isChainKey(value: unknown): value is ChainKey {
  return typeof value === "string" && KNOWN_CHAIN_KEY_SET.has(value);
}

/**
 * List all known chain keys.
 */
export function knownChainKeys(): readonly ChainKey[] {
  return Object.values(KNOWN_CHAIN_KEYS);
}
