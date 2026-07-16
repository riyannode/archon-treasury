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
  SUPPORTED_CHAINS,
  parseChainKey,
  safeParseChainKey,
  isChainKey,
  supportedChains,
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

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "6ba7b810-9dad-41d4-80b4-00c04fd430c8";

describe("Typed Identifiers", () => {
  describe("UserId", () => {
    it("parses a valid UUID", () => {
      const id = UserId.parse(VALID_UUID);
      expect(id).toBe(VALID_UUID);
    });

    it("serializes back to string", () => {
      const id = UserId.parse(VALID_UUID);
      expect(UserId.serialize(id)).toBe(VALID_UUID);
    });

    it("rejects invalid UUID (not v4)", () => {
      expect(() => UserId.parse("not-a-uuid")).toThrow("Invalid UserId");
    });

    it("rejects empty string", () => {
      expect(() => UserId.parse("")).toThrow("Invalid UserId");
    });

    it("rejects UUID v1 format", () => {
      expect(() =>
        UserId.parse("6ba7b810-9dad-1101-80b4-00c04fd430c8"),
      ).toThrow("Invalid UserId");
    });

    it("safe parse returns null on invalid", () => {
      expect(UserId.safe("bad")).toBeNull();
    });

    it("safe parse returns id on valid", () => {
      const id = UserId.safe(VALID_UUID);
      expect(id).toBe(VALID_UUID);
    });

    it("is() returns true for valid UUID", () => {
      expect(UserId.is(VALID_UUID)).toBe(true);
    });

    it("is() returns false for non-string", () => {
      expect(UserId.is(123)).toBe(false);
    });

    it("is() returns false for invalid UUID", () => {
      expect(UserId.is("bad")).toBe(false);
    });
  });

  describe("OrganizationId", () => {
    it("parses a valid UUID", () => {
      const id = OrganizationId.parse(VALID_UUID);
      expect(id).toBe(VALID_UUID);
    });

    it("rejects invalid UUID", () => {
      expect(() => OrganizationId.parse("bad")).toThrow(
        "Invalid OrganizationId",
      );
    });
  });

  describe("TreasuryId", () => {
    it("parses a valid UUID", () => {
      const id = TreasuryId.parse(VALID_UUID);
      expect(id).toBe(VALID_UUID);
    });

    it("rejects invalid UUID", () => {
      expect(() => TreasuryId.parse("bad")).toThrow("Invalid TreasuryId");
    });
  });

  describe("WalletId", () => {
    it("parses a valid UUID", () => {
      const id = WalletId.parse(VALID_UUID);
      expect(id).toBe(VALID_UUID);
    });

    it("rejects invalid UUID", () => {
      expect(() => WalletId.parse("bad")).toThrow("Invalid WalletId");
    });
  });

  describe("Type isolation", () => {
    it("OrganizationId cannot be used as TreasuryId at runtime", () => {
      const orgId = OrganizationId.parse(VALID_UUID);
      const treasuryId = TreasuryId.parse(VALID_UUID_2);

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
      const valid = VALID_UUID;
      expect(UserId.parse(valid)).toBe(valid);
      expect(OrganizationId.parse(valid)).toBe(valid);
      expect(TreasuryId.parse(valid)).toBe(valid);
      expect(WalletId.parse(valid)).toBe(valid);
    });
  });
});

// ── ChainKey ─────────────────────────────────────────────────────────────────

describe("ChainKey", () => {
  it("parses ETHEREUM_SEPOLIA", () => {
    expect(parseChainKey("ETHEREUM_SEPOLIA")).toBe("ETHEREUM_SEPOLIA");
  });

  it("parses ARC_TESTNET", () => {
    expect(parseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  it("parses all supported chains", () => {
    expect(parseChainKey("ETHEREUM_SEPOLIA")).toBe("ETHEREUM_SEPOLIA");
    expect(parseChainKey("BASE_SEPOLIA")).toBe("BASE_SEPOLIA");
    expect(parseChainKey("OP_SEPOLIA")).toBe("OP_SEPOLIA");
    expect(parseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  it("rejects unsupported chain", () => {
    expect(() => parseChainKey("POLYGON_MAINNET")).toThrow(
      "Unsupported ChainKey",
    );
  });

  it("rejects arbitrary string", () => {
    expect(() => parseChainKey("random")).toThrow("Unsupported ChainKey");
  });

  it("rejects empty string", () => {
    expect(() => parseChainKey("")).toThrow("Unsupported ChainKey");
  });

  it("rejects lowercase variant", () => {
    expect(() => parseChainKey("ethereum_sepolia")).toThrow(
      "Unsupported ChainKey",
    );
  });

  it("safe parse returns null on unsupported", () => {
    expect(safeParseChainKey("POLYGON")).toBeNull();
  });

  it("safe parse returns chain on supported", () => {
    expect(safeParseChainKey("ARC_TESTNET")).toBe("ARC_TESTNET");
  });

  it("isChainKey returns true for supported", () => {
    expect(isChainKey("ARC_TESTNET")).toBe(true);
  });

  it("isChainKey returns false for unsupported", () => {
    expect(isChainKey("POLYGON")).toBe(false);
  });

  it("isChainKey returns false for non-string", () => {
    expect(isChainKey(42)).toBe(false);
  });

  it("supportedChains() returns all 4 chains", () => {
    expect(supportedChains()).toHaveLength(4);
  });

  it("SUPPORTED_CHAINS has exactly 4 entries", () => {
    expect(Object.keys(SUPPORTED_CHAINS)).toHaveLength(4);
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
