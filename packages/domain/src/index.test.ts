import { describe, it, expect } from "vitest";
import {
  // Money
  createUsdcMoney,
  toHumanUsdc,
  formatUsdc,
  // Identifiers
  UserId,
  OrganizationId,
  TreasuryId,
  WalletId,
  // Chain
  KNOWN_CHAIN_KEYS,
  parseChainKey,
  safeParseChainKey,
  isChainKey,
  knownChainKeys,
  // Asset
  SUPPORTED_ASSETS,
  parseAssetId,
  safeParseAssetId,
  isAssetId,
  supportedAssets,
  // Address
  createAddress,
  safeCreateAddress,
  addressesEqual,
  serializeAddress,
} from "./index.js";

// ── Money (existing) ─────────────────────────────────────────────────────────

describe("Money (USDC)", () => {
  it("creates USDC money from human amount", () => {
    const m = createUsdcMoney(1.5);
    expect(m.amount).toBe("1500000");
    expect(m.decimals).toBe(6);
    expect(m.asset).toBe("USDC");
  });

  it("converts atomic back to human", () => {
    const m = createUsdcMoney(10);
    expect(toHumanUsdc(m)).toBe(10);
  });

  it("formats as string", () => {
    const m = createUsdcMoney(42.000001);
    expect(formatUsdc(m)).toContain("USDC");
  });

  it("handles zero", () => {
    const m = createUsdcMoney(0);
    expect(m.amount).toBe("0");
    expect(toHumanUsdc(m)).toBe(0);
  });
});

// ── Typed Identifiers ────────────────────────────────────────────────────────

// UUID v4 (version nibble = 4, variant bits = 10xx)
const UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";
const UUID_V4_2 = "6ba7b810-9dad-41d4-80b4-00c04fd430c8";

// UUID v7 (version nibble = 7, variant bits = 10xx)
const UUID_V7 = "0190e4f8-8c12-7abc-9def-0123456789ab";

// UUID v1 (version nibble = 1, should be rejected)
const UUID_V1 = "6ba7b810-9dad-1101-80b4-00c04fd430c8";

// Malformed UUID (wrong variant bits — 0xxx instead of 10xx)
const MALFORMED_VARIANT = "550e8400-e29b-41d4-0716-446655440000";

describe("Typed Identifiers", () => {
  describe("UserId", () => {
    it("parses a valid UUID v4", () => {
      const id = UserId.parse(UUID_V4);
      expect(id).toBe(UUID_V4);
    });

    it("parses a valid UUID v7", () => {
      const id = UserId.parse(UUID_V7);
      expect(id).toBe(UUID_V7);
    });

    it("serializes back to string", () => {
      const id = UserId.parse(UUID_V4);
      expect(UserId.serialize(id)).toBe(UUID_V4);
    });

    it("rejects malformed UUID (not a UUID at all)", () => {
      expect(() => UserId.parse("not-a-uuid")).toThrow("Invalid UserId");
    });

    it("rejects empty string", () => {
      expect(() => UserId.parse("")).toThrow("Invalid UserId");
    });

    it("rejects UUID v1 (unsupported version)", () => {
      expect(() => UserId.parse(UUID_V1)).toThrow("Invalid UserId");
    });

    it("rejects UUID with invalid variant bits", () => {
      expect(() => UserId.parse(MALFORMED_VARIANT)).toThrow("Invalid UserId");
    });

    it("rejects UUID with wrong segment lengths", () => {
      expect(() =>
        UserId.parse("550e8400-e29-41d4-a716-446655440000"),
      ).toThrow("Invalid UserId");
    });

    it("rejects UUID with non-hex characters", () => {
      expect(() =>
        UserId.parse("550e8400-e29b-41d4-a71g-446655440000"),
      ).toThrow("Invalid UserId");
    });

    it("safe parse returns null on invalid", () => {
      expect(UserId.safe("bad")).toBeNull();
    });

    it("safe parse returns id on valid v4", () => {
      const id = UserId.safe(UUID_V4);
      expect(id).toBe(UUID_V4);
    });

    it("safe parse returns id on valid v7", () => {
      const id = UserId.safe(UUID_V7);
      expect(id).toBe(UUID_V7);
    });

    it("is() returns true for valid UUID v4", () => {
      expect(UserId.is(UUID_V4)).toBe(true);
    });

    it("is() returns true for valid UUID v7", () => {
      expect(UserId.is(UUID_V7)).toBe(true);
    });

    it("is() returns false for non-string", () => {
      expect(UserId.is(123)).toBe(false);
    });

    it("is() returns false for invalid UUID", () => {
      expect(UserId.is("bad")).toBe(false);
    });
  });

  describe("OrganizationId", () => {
    it("parses a valid UUID v4", () => {
      const id = OrganizationId.parse(UUID_V4);
      expect(id).toBe(UUID_V4);
    });

    it("parses a valid UUID v7", () => {
      const id = OrganizationId.parse(UUID_V7);
      expect(id).toBe(UUID_V7);
    });

    it("rejects invalid UUID", () => {
      expect(() => OrganizationId.parse("bad")).toThrow(
        "Invalid OrganizationId",
      );
    });
  });

  describe("TreasuryId", () => {
    it("parses a valid UUID v4", () => {
      const id = TreasuryId.parse(UUID_V4);
      expect(id).toBe(UUID_V4);
    });

    it("parses a valid UUID v7", () => {
      const id = TreasuryId.parse(UUID_V7);
      expect(id).toBe(UUID_V7);
    });

    it("rejects invalid UUID", () => {
      expect(() => TreasuryId.parse("bad")).toThrow("Invalid TreasuryId");
    });
  });

  describe("WalletId", () => {
    it("parses a valid UUID v4", () => {
      const id = WalletId.parse(UUID_V4);
      expect(id).toBe(UUID_V4);
    });

    it("parses a valid UUID v7", () => {
      const id = WalletId.parse(UUID_V7);
      expect(id).toBe(UUID_V7);
    });

    it("rejects invalid UUID", () => {
      expect(() => WalletId.parse("bad")).toThrow("Invalid WalletId");
    });
  });

  describe("Type isolation", () => {
    it("OrganizationId and TreasuryId hold different values", () => {
      const orgId = OrganizationId.parse(UUID_V4);
      const treasuryId = TreasuryId.parse(UUID_V4_2);

      // At runtime, both are just strings — the isolation is at the type level.
      // This test documents that they ARE different values.
      expect(orgId).not.toBe(treasuryId);
    });

    it("all identifiers reject non-UUID strings", () => {
      const invalid = "not-a-uuid";
      expect(() => UserId.parse(invalid)).toThrow();
      expect(() => OrganizationId.parse(invalid)).toThrow();
      expect(() => TreasuryId.parse(invalid)).toThrow();
      expect(() => WalletId.parse(invalid)).toThrow();
    });

    it("all identifiers accept valid UUID v4", () => {
      expect(UserId.parse(UUID_V4)).toBe(UUID_V4);
      expect(OrganizationId.parse(UUID_V4)).toBe(UUID_V4);
      expect(TreasuryId.parse(UUID_V4)).toBe(UUID_V4);
      expect(WalletId.parse(UUID_V4)).toBe(UUID_V4);
    });

    it("all identifiers accept valid UUID v7", () => {
      expect(UserId.parse(UUID_V7)).toBe(UUID_V7);
      expect(OrganizationId.parse(UUID_V7)).toBe(UUID_V7);
      expect(TreasuryId.parse(UUID_V7)).toBe(UUID_V7);
      expect(WalletId.parse(UUID_V7)).toBe(UUID_V7);
    });

    it("all identifiers reject UUID v1", () => {
      expect(() => UserId.parse(UUID_V1)).toThrow();
      expect(() => OrganizationId.parse(UUID_V1)).toThrow();
      expect(() => TreasuryId.parse(UUID_V1)).toThrow();
      expect(() => WalletId.parse(UUID_V1)).toThrow();
    });
  });
});

// ── ChainKey ─────────────────────────────────────────────────────────────────

describe("ChainKey", () => {
  // Known chain key tests
  it("parses ETHEREUM_SEPOLIA", () => {
    expect(parseChainKey("ETHEREUM_SEPOLIA")).toBe("ETHEREUM_SEPOLIA");
  });

  it("parses ARC_TESTNET", () => {
    expect(parseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  it("parses all 4 known chain keys", () => {
    expect(parseChainKey("ETHEREUM_SEPOLIA")).toBe("ETHEREUM_SEPOLIA");
    expect(parseChainKey("BASE_SEPOLIA")).toBe("BASE_SEPOLIA");
    expect(parseChainKey("OP_SEPOLIA")).toBe("OP_SEPOLIA");
    expect(parseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  // Rejection tests
  it("rejects unknown chain key", () => {
    expect(() => parseChainKey("POLYGON_MAINNET")).toThrow(
      "Unknown ChainKey",
    );
  });

  it("rejects arbitrary string", () => {
    expect(() => parseChainKey("random")).toThrow("Unknown ChainKey");
  });

  it("rejects empty string", () => {
    expect(() => parseChainKey("")).toThrow("Unknown ChainKey");
  });

  it("rejects lowercase variant (case-sensitive)", () => {
    expect(() => parseChainKey("ethereum_sepolia")).toThrow(
      "Unknown ChainKey",
    );
  });

  // Safe parse
  it("safe parse returns null on unknown", () => {
    expect(safeParseChainKey("POLYGON")).toBeNull();
  });

  it("safe parse returns chain on known", () => {
    expect(safeParseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  // Type guard
  it("isChainKey returns true for known", () => {
    expect(isChainKey("ARC_TESTNET")).toBe(true);
  });

  it("isChainKey returns false for unknown", () => {
    expect(isChainKey("POLYGON")).toBe(false);
  });

  it("isChainKey returns false for non-string", () => {
    expect(isChainKey(42)).toBe(false);
  });

  // Listing
  it("knownChainKeys() returns exactly 4 values", () => {
    expect(knownChainKeys()).toHaveLength(4);
  });

  it("KNOWN_CHAIN_KEYS has exactly 4 entries", () => {
    expect(Object.keys(KNOWN_CHAIN_KEYS)).toHaveLength(4);
  });

  // Known chain keys ≠ runtime capability
  it("known chain keys are domain identifiers, not runtime capability claims", () => {
    // A chain key being "known" only means it is recognized by the domain model.
    // It does NOT imply that RPC endpoints, Circle integration, bridge support,
    // route engine support, or any provider is configured or available.
    // Operational capability is determined by the chain/provider registry.
    const known = knownChainKeys();
    expect(known).toContain("ETHEREUM_SEPOLIA");
    expect(known).toContain("ARC_TESTNET");
    // This is a documentation test — the assertion is intentional.
    // If someone adds a chain to KNOWN_CHAIN_KEYS, this test reminds them
    // that "known" ≠ "operational".
  });
});

// ── AssetId ──────────────────────────────────────────────────────────────────

describe("AssetId", () => {
  it("parses USDC", () => {
    expect(parseAssetId("USDC")).toBe("USDC");
  });

  it("rejects unsupported asset", () => {
    expect(() => parseAssetId("ETH")).toThrow("Unsupported AssetId");
  });

  it("rejects lowercase usdc", () => {
    expect(() => parseAssetId("usdc")).toThrow("Unsupported AssetId");
  });

  it("rejects empty string", () => {
    expect(() => parseAssetId("")).toThrow("Unsupported AssetId");
  });

  it("safe parse returns null on unsupported", () => {
    expect(safeParseAssetId("ETH")).toBeNull();
  });

  it("safe parse returns asset on supported", () => {
    expect(safeParseAssetId("USDC")).toBe("USDC");
  });

  it("isAssetId returns true for USDC", () => {
    expect(isAssetId("USDC")).toBe(true);
  });

  it("isAssetId returns false for unsupported", () => {
    expect(isAssetId("ETH")).toBe(false);
  });

  it("isAssetId returns false for non-string", () => {
    expect(isAssetId(null)).toBe(false);
  });

  it("supportedAssets() returns just USDC", () => {
    expect(supportedAssets()).toEqual(["USDC"]);
  });

  it("SUPPORTED_ASSETS has exactly 1 entry", () => {
    expect(Object.keys(SUPPORTED_ASSETS)).toHaveLength(1);
  });
});

// ── Address Value Object ─────────────────────────────────────────────────────

describe("Address", () => {
  const VALID_ADDRESS = "0x3600000000000000000000000000000000000000";

  describe("createAddress", () => {
    it("creates address with valid EVM format", () => {
      const addr = createAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(addr.chain).toBe("ARC_TESTNET");
      expect(addr.raw).toBe(VALID_ADDRESS);
      expect(addr.normalized).toBe(VALID_ADDRESS.toLowerCase());
    });

    it("normalizes uppercase to lowercase", () => {
      const upper = "0x3600000000000000000000000000000000000000";
      const addr = createAddress("ETHEREUM_SEPOLIA", upper);
      expect(addr.normalized).toBe(upper.toLowerCase());
    });

    it("normalizes mixed case to lowercase", () => {
      const mixed = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";
      const addr = createAddress("ETHEREUM_SEPOLIA", mixed);
      expect(addr.normalized).toBe(mixed.toLowerCase());
    });

    it("rejects empty string", () => {
      expect(() => createAddress("ARC_TESTNET", "")).toThrow(
        "empty string",
      );
    });

    it("rejects whitespace-only string", () => {
      expect(() => createAddress("ARC_TESTNET", "  ")).toThrow();
    });

    it("rejects address without 0x prefix", () => {
      expect(() =>
        createAddress(
          "ARC_TESTNET",
          "3600000000000000000000000000000000000000",
        ),
      ).toThrow("must start with 0x");
    });

    it("rejects address with wrong length (too short)", () => {
      expect(() =>
        createAddress("ARC_TESTNET", "0x3600"),
      ).toThrow("length");
    });

    it("rejects address with wrong length (too long)", () => {
      expect(() =>
        createAddress(
          "ARC_TESTNET",
          "0x360000000000000000000000000000000000000000",
        ),
      ).toThrow("length");
    });

    it("rejects non-hex characters", () => {
      expect(() =>
        createAddress(
          "ARC_TESTNET",
          "0xGGGG000000000000000000000000000000000000",
        ),
      ).toThrow("non-hex");
    });

    it("rejects mixed hex and non-hex", () => {
      expect(() =>
        createAddress(
          "ARC_TESTNET",
          "0x36000000000000000000000000000000000ZZZZZ",
        ),
      ).toThrow("non-hex");
    });

    it("binds address to chain", () => {
      const addr1 = createAddress("ETHEREUM_SEPOLIA", VALID_ADDRESS);
      const addr2 = createAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(addr1.chain).toBe("ETHEREUM_SEPOLIA");
      expect(addr2.chain).toBe("ARC_TESTNET");
    });
  });

  describe("safeCreateAddress", () => {
    it("returns address on valid input", () => {
      const addr = safeCreateAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(addr).not.toBeNull();
      expect(addr?.chain).toBe("ARC_TESTNET");
    });

    it("returns null on invalid address", () => {
      expect(safeCreateAddress("ARC_TESTNET", "bad")).toBeNull();
    });

    it("returns null on empty string", () => {
      expect(safeCreateAddress("ARC_TESTNET", "")).toBeNull();
    });
  });

  describe("addressesEqual", () => {
    it("equal when same chain + same address", () => {
      const a = createAddress("ARC_TESTNET", VALID_ADDRESS);
      const b = createAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(addressesEqual(a, b)).toBe(true);
    });

    it("not equal when same address + different chain", () => {
      const a = createAddress("ETHEREUM_SEPOLIA", VALID_ADDRESS);
      const b = createAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(addressesEqual(a, b)).toBe(false);
    });

    it("equal when case differs (normalized)", () => {
      const a = createAddress("ARC_TESTNET", VALID_ADDRESS.toUpperCase());
      const b = createAddress("ARC_TESTNET", VALID_ADDRESS.toLowerCase());
      expect(addressesEqual(a, b)).toBe(true);
    });

    it("not equal when address differs", () => {
      const a = createAddress("ARC_TESTNET", VALID_ADDRESS);
      const b = createAddress(
        "ARC_TESTNET",
        "0x0000000000000000000000000000000000000001",
      );
      expect(addressesEqual(a, b)).toBe(false);
    });
  });

  describe("serializeAddress", () => {
    it("serializes as CHAIN:address", () => {
      const addr = createAddress("ARC_TESTNET", VALID_ADDRESS);
      expect(serializeAddress(addr)).toBe(
        `ARC_TESTNET:${VALID_ADDRESS.toLowerCase()}`,
      );
    });

    it("normalizes in serialization", () => {
      const addr = createAddress("ARC_TESTNET", VALID_ADDRESS.toUpperCase());
      expect(serializeAddress(addr)).toBe(
        `ARC_TESTNET:${VALID_ADDRESS.toLowerCase()}`,
      );
    });
  });
});
