// ── Domain Errors ──────────────────────────────────────────────────────────
// Shared error types for the domain layer.
// No PostgreSQL error codes — database layer maps DB errors to these.
//
// Error taxonomy:
//   - DomainError: base class for all domain errors
//   - NotFoundError: entity not found by identifier
//   - ConflictError: unique constraint violation (slug conflict, etc.)
//   - ValidationError: invalid input before persistence

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
  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`, "NOT_FOUND");
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
