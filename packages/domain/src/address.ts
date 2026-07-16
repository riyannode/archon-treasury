// ── EVM Address Value Object ─────────────────────────────────────────────────
// An address is always bound to a ChainKey.
// Validates EVM hex format (0x + 40 hex chars) — no RPC/network requests.
// Address equality requires same chain AND same normalized address.

import type { ChainKey } from "./chain.js";

// 0x + exactly 40 hex characters
const EVM_ADDRESS_RE = /^0[xX][0-9a-fA-F]{40}$/;

export interface Address {
  readonly chain: ChainKey;
  readonly raw: string; // original input
  readonly normalized: string; // lowercase 0x + 40 hex
}

/**
 * Parse and validate an EVM address for a given chain.
 *
 * @throws on empty string, wrong length, non-hex characters.
 * Normalizes to lowercase consistently.
 * Does NOT compute EIP-55 checksum — use a dedicated library for that.
 */
export function createAddress(chain: ChainKey, value: string): Address {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Address: empty string is not a valid address");
  }

  const trimmed = value.trim();

  // Must start with 0x
  if (!trimmed.startsWith("0x") && !trimmed.startsWith("0X")) {
    throw new Error(
      `Address: "${trimmed}" must start with 0x`,
    );
  }

  // Must be exactly 42 characters (0x + 40 hex)
  if (trimmed.length !== 42) {
    throw new Error(
      `Address: "${trimmed}" has length ${trimmed.length}, expected 42 (0x + 40 hex chars)`,
    );
  }

  // Must be valid hex
  if (!EVM_ADDRESS_RE.test(trimmed)) {
    throw new Error(
      `Address: "${trimmed}" contains non-hex characters`,
    );
  }

  const normalized = trimmed.toLowerCase();

  return { chain, raw: value, normalized };
}

/**
 * Safe parse — returns null on invalid address.
 */
export function safeCreateAddress(
  chain: ChainKey,
  value: string,
): Address | null {
  try {
    return createAddress(chain, value);
  } catch {
    return null;
  }
}

/**
 * Check if two addresses are equal (same chain + same normalized address).
 */
export function addressesEqual(a: Address, b: Address): boolean {
  return a.chain === b.chain && a.normalized === b.normalized;
}

/**
 * Serialize an address to a display string: `CHAIN:0x...` (lowercase).
 */
export function serializeAddress(addr: Address): string {
  return `${addr.chain}:${addr.normalized}`;
}
