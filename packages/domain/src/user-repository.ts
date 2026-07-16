// ── User Repository Interface ────────────────────────────────────────────
// Repository contract for User persistence.
//
// This interface lives in the domain package — it has NO dependency on
// Drizzle, PostgreSQL, or any database-specific library.
// Implementations live in infrastructure (database package).

import type { UserId } from "./identifiers.js";
import type { User, UserStatus } from "./user.js";
import type { UserEmail } from "./user-email.js";

// ── Input types ───────────────────────────────────────────────────────────

export interface CreateUserInput {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
}

export interface UpdateUserInput {
  readonly id: UserId;
  readonly email?: string;
  readonly displayName?: string;
  readonly status?: UserStatus;
}

// ── Repository contract ───────────────────────────────────────────────────

export interface UserRepository {
  /**
   * Create a new user.
   * Throws ConflictError if email already exists.
   * Throws ValidationError if input is invalid.
   */
  create(input: CreateUserInput): Promise<User>;

  /**
   * Find user by ID.
   * Returns null if not found.
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find user by email.
   * Returns null if not found.
   */
  findByEmail(email: UserEmail): Promise<User | null>;

  /**
   * Update user fields.
   * Throws NotFoundError if id does not exist.
   * Throws ConflictError if email already exists on another user.
   */
  update(input: UpdateUserInput): Promise<User>;
}
