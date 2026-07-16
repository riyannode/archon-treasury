// ── Domain Errors ──────────────────────────────────────────────────────────
// Shared error types for the domain layer.
// No PostgreSQL error codes — database layer maps DB errors to these.
//
// Error taxonomy:
//   - DomainError: base class for all domain errors
//   - NotFoundError: entity not found by identifier
//   - ConflictError: unique constraint violation (slug conflict, etc.)
//   - ValidationError: invalid input before persistence
//   - DataIntegrityError: malformed persisted state

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier?: string) {
    super(
      identifier ? `${entity} not found: ${identifier}` : `${entity} not found`,
      "NOT_FOUND",
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class DataIntegrityError extends DomainError {
  constructor(message: string) {
    super(message, "DATA_INTEGRITY_ERROR");
    this.name = "DataIntegrityError";
  }
}

// ── Organization-specific errors ──────────────────────────────────────────

export function organizationNotFoundError(identifier: string): NotFoundError {
  return new NotFoundError("Organization", identifier);
}

export function organizationSlugConflictError(slug: string): ConflictError {
  return new ConflictError(`Organization slug already exists: "${slug}"`);
}

export function invalidOrganizationNameError(reason?: string): ValidationError {
  const msg = reason
    ? `Invalid organization name: ${reason}`
    : "Invalid organization name";
  return new ValidationError(msg);
}

export function invalidOrganizationSlugError(reason?: string): ValidationError {
  const msg = reason
    ? `Invalid organization slug: ${reason}`
    : "Invalid organization slug";
  return new ValidationError(msg);
}

export function invalidOrganizationStatusTransitionError(
  from: string,
  to: string,
): ValidationError {
  return new ValidationError(
    `Invalid organization status transition: ${from} → ${to}`,
  );
}

export function emptyUpdateError(): ValidationError {
  return new ValidationError("Empty update: no fields to change");
}

export function organizationPersistenceError(reason: string): DataIntegrityError {
  return new DataIntegrityError(
    `Organization persistence mapping failed: ${reason}`,
  );
}

// ── Treasury-specific errors ─────────────────────────────────────────────

export function invalidTreasuryNameError(): ValidationError {
  return new ValidationError("Invalid treasury name");
}

export function invalidTreasuryStatusError(): ValidationError {
  return new ValidationError("Invalid treasury status");
}

export function invalidTreasuryEnvironmentError(): ValidationError {
  return new ValidationError("Invalid treasury environment");
}

export function treasuryConflictError(): ConflictError {
  return new ConflictError(
    "A treasury with this name already exists in this organization",
  );
}

export function treasuryNotFoundError(): NotFoundError {
  return new NotFoundError("Treasury");
}

export function treasuryPersistenceError(reason: string): DataIntegrityError {
  return new DataIntegrityError(`Treasury persistence mapping failed: ${reason}`);
}

export function emptyTreasuryUpdateError(): ValidationError {
  return new ValidationError("Empty treasury update: no fields to change");
}

// ── User-specific errors ──────────────────────────────────────────────────

export function userNotFoundError(): NotFoundError {
  return new NotFoundError("User");
}

export function userEmailConflictError(): ConflictError {
  return new ConflictError("A user with this email already exists");
}

export function invalidUserEmailError(): ValidationError {
  return new ValidationError("Invalid user email");
}

export function invalidUserDisplayNameError(reason?: string): ValidationError {
  const msg = reason
    ? `Invalid user display name: ${reason}`
    : "Invalid user display name";
  return new ValidationError(msg);
}

export function invalidUserStatusError(): ValidationError {
  return new ValidationError("Invalid user status");
}

export function userPersistenceError(reason: string): DataIntegrityError {
  return new DataIntegrityError(`User persistence mapping failed: ${reason}`);
}

// ── Organization Member-specific errors ───────────────────────────────────

export function membershipNotFoundError(): NotFoundError {
  return new NotFoundError("OrganizationMember");
}

export function membershipConflictError(): ConflictError {
  return new ConflictError(
    "User already has a membership in this organization",
  );
}

export function invalidMembershipRoleError(): ValidationError {
  return new ValidationError("Invalid membership role");
}

export function invalidMembershipStatusError(): ValidationError {
  return new ValidationError("Invalid membership status");
}

export function membershipPersistenceError(reason: string): DataIntegrityError {
  return new DataIntegrityError(
    `OrganizationMember persistence mapping failed: ${reason}`,
  );
}

// ── RBAC errors ───────────────────────────────────────────────────────────

export function principalNotOperationalError(): DomainError {
  return new DomainError(
    "Principal is not operational",
    "PRINCIPAL_NOT_OPERATIONAL",
  );
}

export function permissionDeniedError(permission: string): DomainError {
  return new DomainError(
    `Permission denied: ${permission}`,
    "PERMISSION_DENIED",
  );
}
