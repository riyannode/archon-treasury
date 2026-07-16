// ── User Domain Entity ─────────────────────────────────────────────────────
// User represents a minimal identity in Archon Treasury.
// One user may belong to multiple organizations.
//
// Invariant: User entity is immutable after creation.
// Mutation returns a new object — never mutates in place.
// No password, JWT, session, OIDC, MFA, or auth-provider logic.

import type { UserId } from "./identifiers.js";
import { UserEmail, type UserEmail as UserEmailValue } from "./user-email.js";
import {
  invalidUserDisplayNameError,
  invalidUserStatusError,
} from "./errors.js";

// ── Status ────────────────────────────────────────────────────────────────

export const UserStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

const VALID_STATUSES = new Set<string>(Object.values(UserStatus));

export function isValidUserStatus(status: string): boolean {
  return VALID_STATUSES.has(status);
}

export function validateUserStatus(status: string): UserStatus {
  if (!isValidUserStatus(status)) {
    throw invalidUserStatusError();
  }
  return status as UserStatus;
}

// ── Entity ────────────────────────────────────────────────────────────────

export interface User {
  readonly id: UserId;
  readonly email: UserEmailValue;
  readonly displayName: string;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Display name validation ──────────────────────────────────────────────

const DISPLAY_NAME_MIN_LENGTH = 1;
const DISPLAY_NAME_MAX_LENGTH = 255;

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= DISPLAY_NAME_MIN_LENGTH &&
    trimmed.length <= DISPLAY_NAME_MAX_LENGTH
  );
}

export function validateUserDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!isValidDisplayName(trimmed)) {
    throw invalidUserDisplayNameError(
      `must be non-empty and at most ${DISPLAY_NAME_MAX_LENGTH} characters after trim`,
    );
  }
  return trimmed;
}

// ── Create ────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
}

export function createUser(input: CreateUserInput, now?: Date): User {
  const email = UserEmail.parse(input.email);
  const displayName = validateUserDisplayName(input.displayName);
  const timestamp = now ?? new Date();

  return {
    id: input.id,
    email,
    displayName,
    status: UserStatus.ACTIVE,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// ── Update operations (explicit methods) ──────────────────────────────────

export interface UpdateUserEmailInput {
  readonly user: User;
  readonly email: string;
}

export function updateUserEmail(input: UpdateUserEmailInput): User {
  const email = UserEmail.parse(input.email);

  // Same email → deterministic no-op
  if (input.user.email === email) {
    return input.user;
  }

  return {
    ...input.user,
    email,
    updatedAt: new Date(),
  };
}

export interface UpdateUserDisplayNameInput {
  readonly user: User;
  readonly displayName: string;
}

export function updateUserDisplayName(input: UpdateUserDisplayNameInput): User {
  const displayName = validateUserDisplayName(input.displayName);

  // Same displayName → deterministic no-op
  if (input.user.displayName === displayName) {
    return input.user;
  }

  return {
    ...input.user,
    displayName,
    updatedAt: new Date(),
  };
}

export function suspendUser(user: User): User {
  if (user.status === UserStatus.SUSPENDED) {
    return user; // already suspended — deterministic no-op
  }
  return {
    ...user,
    status: UserStatus.SUSPENDED,
    updatedAt: new Date(),
  };
}

export function activateUser(user: User): User {
  if (user.status === UserStatus.ACTIVE) {
    return user; // already active — deterministic no-op
  }
  return {
    ...user,
    status: UserStatus.ACTIVE,
    updatedAt: new Date(),
  };
}
