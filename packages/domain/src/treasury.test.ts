import { describe, expect, it } from "vitest";
import {
  DataIntegrityError,
  ValidationError,
  invalidTreasuryEnvironmentError,
  invalidTreasuryNameError,
  invalidTreasuryStatusError,
  treasuryConflictError,
  treasuryNotFoundError,
  treasuryPersistenceError,
} from "./errors.js";
import { OrganizationId, TreasuryId } from "./identifiers.js";
import * as treasuryDomain from "./treasury.js";
import {
  TREASURY_NAME_MAX_LENGTH,
  TREASURY_NAME_RAW_MAX_LENGTH,
  TreasuryEnvironment,
  TreasuryStatus,
  activateTreasury,
  createTreasury,
  isValidTreasuryEnvironment,
  isValidTreasuryStatus,
  renameTreasury,
  suspendTreasury,
  validateTreasuryEnvironment,
  validateTreasuryName,
  validateTreasuryStatus,
  type Treasury,
} from "./treasury.js";

const treasuryId = TreasuryId.parse("550e8400-e29b-41d4-a716-446655440000");
const organizationId = OrganizationId.parse(
  "0190e4f8-8c12-7abc-9def-446655440001",
);
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const changedAt = new Date("2026-01-02T00:00:00.000Z");

function makeTreasury(overrides: Partial<Treasury> = {}): Treasury {
  return Object.freeze({
    id: treasuryId,
    organizationId,
    name: "Main Treasury",
    status: TreasuryStatus.ACTIVE,
    environment: TreasuryEnvironment.TESTNET,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });
}

describe("Treasury name", () => {
  it("accepts and trims a valid name", () => {
    expect(validateTreasuryName("  Main Treasury  ")).toBe("Main Treasury");
  });

  it.each(["", "   "])("rejects empty normalized input", (name) => {
    expect(() => validateTreasuryName(name)).toThrow(ValidationError);
  });

  it("accepts the normalized maximum length", () => {
    expect(validateTreasuryName("a".repeat(TREASURY_NAME_MAX_LENGTH))).toHaveLength(
      TREASURY_NAME_MAX_LENGTH,
    );
  });

  it("rejects an over-limit normalized name", () => {
    expect(() =>
      validateTreasuryName("a".repeat(TREASURY_NAME_MAX_LENGTH + 1)),
    ).toThrow(ValidationError);
  });

  it("bounds raw input before normalization", () => {
    expect(() =>
      validateTreasuryName(" ".repeat(TREASURY_NAME_RAW_MAX_LENGTH + 1)),
    ).toThrow(ValidationError);
  });

  it("handles unusual Unicode deterministically", () => {
    expect(validateTreasuryName("  財務 🚀  ")).toBe("財務 🚀");
  });

  it("does not echo attacker-controlled input", () => {
    const attackerInput = `<script>${"x".repeat(1_100)}</script>`;
    try {
      validateTreasuryName(attackerInput);
      expect.fail("expected validation failure");
    } catch (error) {
      expect((error as Error).message).not.toContain(attackerInput);
    }
  });
});

describe("Treasury status and environment", () => {
  it.each([TreasuryStatus.ACTIVE, TreasuryStatus.SUSPENDED])(
    "accepts status %s",
    (status) => {
      expect(isValidTreasuryStatus(status)).toBe(true);
      expect(validateTreasuryStatus(status)).toBe(status);
    },
  );

  it("rejects unknown status without echoing it", () => {
    const value = "attacker-status";
    expect(isValidTreasuryStatus(value)).toBe(false);
    try {
      validateTreasuryStatus(value);
      expect.fail("expected validation failure");
    } catch (error) {
      expect((error as Error).message).not.toContain(value);
    }
  });

  it.each([TreasuryEnvironment.TESTNET, TreasuryEnvironment.MAINNET])(
    "accepts environment metadata %s",
    (environment) => {
      expect(isValidTreasuryEnvironment(environment)).toBe(true);
      expect(validateTreasuryEnvironment(environment)).toBe(environment);
    },
  );

  it("rejects unknown environment without echoing it", () => {
    const value = "attacker-environment";
    expect(isValidTreasuryEnvironment(value)).toBe(false);
    try {
      validateTreasuryEnvironment(value);
      expect.fail("expected validation failure");
    } catch (error) {
      expect((error as Error).message).not.toContain(value);
    }
  });
});

describe("Treasury entity", () => {
  it("creates active immutable organization-owned treasury", () => {
    const treasury = createTreasury(
      {
        id: treasuryId,
        organizationId,
        name: "  Main Treasury  ",
        environment: TreasuryEnvironment.MAINNET,
      },
      createdAt,
    );
    expect(treasury).toEqual({
      id: treasuryId,
      organizationId,
      name: "Main Treasury",
      status: TreasuryStatus.ACTIVE,
      environment: TreasuryEnvironment.MAINNET,
      createdAt,
      updatedAt: createdAt,
    });
    expect(Object.isFrozen(treasury)).toBe(true);
  });

  it("rejects invalid creation timestamp", () => {
    expect(() =>
      createTreasury(
        {
          id: treasuryId,
          organizationId,
          name: "Main",
          environment: TreasuryEnvironment.TESTNET,
        },
        new Date("invalid"),
      ),
    ).toThrow(ValidationError);
  });

  it("renames on semantic change and preserves identity and environment", () => {
    const original = makeTreasury();
    const renamed = renameTreasury({
      treasury: original,
      name: "  Reserve  ",
      now: changedAt,
    });
    expect(renamed).not.toBe(original);
    expect(renamed).toEqual({
      ...original,
      name: "Reserve",
      updatedAt: changedAt,
    });
  });

  it("same normalized rename is a no-op", () => {
    const original = makeTreasury();
    expect(
      renameTreasury({ treasury: original, name: " Main Treasury " }),
    ).toBe(original);
  });

  it("suspends active treasury and preserves ownership", () => {
    const original = makeTreasury();
    const suspended = suspendTreasury(original, changedAt);
    expect(suspended).toEqual({
      ...original,
      status: TreasuryStatus.SUSPENDED,
      updatedAt: changedAt,
    });
    expect(suspended.id).toBe(original.id);
    expect(suspended.organizationId).toBe(original.organizationId);
    expect(suspended.createdAt).toBe(original.createdAt);
  });

  it("suspending suspended treasury is a no-op", () => {
    const original = makeTreasury({ status: TreasuryStatus.SUSPENDED });
    expect(suspendTreasury(original, changedAt)).toBe(original);
  });

  it("activates suspended treasury", () => {
    const original = makeTreasury({ status: TreasuryStatus.SUSPENDED });
    expect(activateTreasury(original, changedAt)).toEqual({
      ...original,
      status: TreasuryStatus.ACTIVE,
      updatedAt: changedAt,
    });
  });

  it("activating active treasury is a no-op", () => {
    const original = makeTreasury();
    expect(activateTreasury(original, changedAt)).toBe(original);
  });

  it("environment is immutable because no mutation function is exported", () => {
    const original = makeTreasury();
    const renamed = renameTreasury({
      treasury: original,
      name: "Reserve",
      now: changedAt,
    });
    expect(renamed.environment).toBe(TreasuryEnvironment.TESTNET);
    expect(suspendTreasury(original, changedAt).environment).toBe(
      TreasuryEnvironment.TESTNET,
    );
    expect(treasuryDomain).not.toHaveProperty("changeTreasuryEnvironment");
  });

  it("rejects malformed persisted timestamps before mutation", () => {
    const malformed = makeTreasury({ updatedAt: new Date("invalid") });
    expect(() => renameTreasury({ treasury: malformed, name: "Reserve" })).toThrow(
      DataIntegrityError,
    );
  });
});

describe("Treasury errors", () => {
  it("uses stable category codes and messages without raw values", () => {
    expect(invalidTreasuryNameError()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid treasury name",
    });
    expect(invalidTreasuryStatusError()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid treasury status",
    });
    expect(invalidTreasuryEnvironmentError()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid treasury environment",
    });
    expect(treasuryConflictError()).toMatchObject({ code: "CONFLICT" });
    expect(treasuryNotFoundError()).toMatchObject({ code: "NOT_FOUND" });
    expect(treasuryPersistenceError("invalid persisted name")).toMatchObject({
      code: "DATA_INTEGRITY_ERROR",
      message: "Treasury persistence mapping failed: invalid persisted name",
    });
  });
});
