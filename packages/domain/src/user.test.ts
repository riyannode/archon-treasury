import { describe, expect, it } from "vitest";
import {
  UserEmail,
  UserId,
  UserStatus,
  activateUser,
  createUser,
  normalizeEmail,
  suspendUser,
  updateUserDisplayName,
  updateUserEmail,
  validateUserStatus,
} from "./index.js";

const USER_ID = UserId.parse("550e8400-e29b-41d4-a716-446655440000");

describe("UserEmail", () => {
  it("trims and lowercases into a typed canonical value", () => {
    const email = UserEmail.parse("  Alice@Example.COM  ");
    expect(email).toBe("alice@example.com");
    expect(UserEmail.is(email)).toBe(true);
    expect(UserEmail.serialize(email)).toBe("alice@example.com");
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it.each([
    "",
    "missing-at.example.com",
    "two@@example.com",
    ".local@example.com",
    "local..part@example.com",
    "local@-example.com",
    "local@example-.com",
    "local@example",
    "local@exa_mple.com",
  ])("rejects malformed email deterministically: %s", (raw) => {
    expect(UserEmail.safe(raw)).toBeNull();
    expect(() => UserEmail.parse(raw)).toThrow("Invalid user email");
  });

  it("enforces raw and normalized length limits before validation", () => {
    expect(UserEmail.safe(`${" ".repeat(513)}a@b.co`)).toBeNull();
    expect(UserEmail.safe(`${"a".repeat(65)}@example.com`)).toBeNull();
    expect(UserEmail.safe(`${"a".repeat(309)}@example.com`)).toBeNull();
  });

  it("does not echo attacker-controlled input in stable errors", () => {
    const attackerValue = "attacker-controlled-value";
    try {
      UserEmail.parse(attackerValue);
      throw new Error("expected validation failure");
    } catch (error) {
      expect((error as Error).message).not.toContain(attackerValue);
    }
  });
});

describe("User", () => {
  it("creates an active immutable identity with normalized fields", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const user = createUser(
      { id: USER_ID, email: " USER@EXAMPLE.COM ", displayName: " Alice " },
      now,
    );
    expect(user).toEqual({
      id: USER_ID,
      email: "user@example.com",
      displayName: "Alice",
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  });

  it("validates user statuses without echoing invalid input", () => {
    expect(validateUserStatus("active")).toBe(UserStatus.ACTIVE);
    expect(validateUserStatus("suspended")).toBe(UserStatus.SUSPENDED);
    expect(() => validateUserStatus("hostile-status")).toThrow(
      "Invalid user status",
    );
  });

  it("applies immutable mutations and deterministic no-ops", () => {
    const user = createUser({
      id: USER_ID,
      email: "user@example.com",
      displayName: "Alice",
    });
    const renamed = updateUserDisplayName({ user, displayName: "Bob" });
    const remailed = updateUserEmail({ user: renamed, email: "BOB@EXAMPLE.COM" });
    const suspended = suspendUser(remailed);

    expect(user.displayName).toBe("Alice");
    expect(renamed).not.toBe(user);
    expect(remailed.email).toBe("bob@example.com");
    expect(suspended.status).toBe(UserStatus.SUSPENDED);
    expect(updateUserDisplayName({ user: renamed, displayName: "Bob" })).toBe(
      renamed,
    );
    expect(updateUserEmail({ user: remailed, email: " bob@example.com " })).toBe(
      remailed,
    );
    expect(suspendUser(suspended)).toBe(suspended);
    const activated = activateUser(suspended);
    expect(activated.status).toBe(UserStatus.ACTIVE);
    expect(activateUser(activated)).toBe(activated);
  });

  it("bounds and trims display names", () => {
    expect(() =>
      createUser({ id: USER_ID, email: "a@b.co", displayName: " ".repeat(3) }),
    ).toThrow("Invalid user display name");
    expect(() =>
      createUser({ id: USER_ID, email: "a@b.co", displayName: "x".repeat(256) }),
    ).toThrow("Invalid user display name");
  });
});
