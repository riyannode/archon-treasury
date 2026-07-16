// ── Organization Slug Value Object ─────────────────────────────────────────
// A validated, canonical slug for organizations.
//
// Normalization:
//   1. Trim whitespace
//   2. Lowercase
//   3. Replace spaces and underscores with hyphens
//   4. Collapse consecutive hyphens
//   5. Trim leading/trailing hyphens
//
// Validation (after normalization):
//   - Only lowercase letters (a-z), digits (0-9), and hyphens (-)
//   - Must match ^[a-z0-9]+(-[a-z0-9]+)*$
//   - Minimum 1 character, maximum 63 characters
//
// Characters NOT in [a-z0-9_- ] cause validation error — they are NOT stripped.
// "archon!" → invalid (not "archon")
// "pay$labs" → invalid (not "paylabs")
// "archon/labs" → invalid (not "archon-labs")

import { invalidOrganizationSlugError } from "./errors.js";

// ── Validation constants ──────────────────────────────────────────────────

const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 63;

// Allowed characters BEFORE normalization: a-z, A-Z, 0-9, hyphen, underscore, space
// After normalization: only a-z, 0-9, hyphen
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Characters that are invalid in slug input (after trim+lowercase, before normalization)
// If the raw input (trimmed, lowercased) contains any of these, it's invalid.
const INVALID_SLUG_CHARS = /[^a-z0-9_\- ]/;

// ── Brand ─────────────────────────────────────────────────────────────────

type Brand<K extends string, T> = T & { readonly __brand: K };

export type OrganizationSlug = Brand<"OrganizationSlug", string>;

// ── Normalization ─────────────────────────────────────────────────────────

/**
 * Detect whether a raw string contains characters that cannot be part of
 * a valid slug even after normalization. Returns the invalid character
 * or null if all characters are acceptable.
 */
export function findInvalidSlugChars(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(INVALID_SLUG_CHARS);
  return match ? match[0]! : null;
}

/**
 * Normalize a raw string into canonical slug form.
 *
 * Allowed transformations:
 *   - Trim whitespace
 *   - Lowercase
 *   - Spaces and underscores → hyphens
 *   - Collapse consecutive hyphens
 *   - Trim leading/trailing hyphens
 *
 * Characters outside [a-z0-9_- ] cause null return (not stripped).
 * Returns null if normalization produces an empty string or if
 * the input contains invalid characters.
 */
export function normalizeSlug(raw: string): string | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Check for invalid characters BEFORE normalizing
  // This prevents "archon!" from becoming "archon"
  if (findInvalidSlugChars(trimmed) !== null) return null;

  let normalized = trimmed
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/-{2,}/g, "-") // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // strip leading/trailing hyphens

  if (normalized.length === 0) return null;
  if (normalized.length > SLUG_MAX_LENGTH) return null;

  return normalized;
}

// ── Validation ────────────────────────────────────────────────────────────

function isValidSlugFormat(value: string): boolean {
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) {
    return false;
  }
  return SLUG_PATTERN.test(value);
}

// ── Public API ────────────────────────────────────────────────────────────

export interface OrganizationSlugAPI {
  parse(value: string): OrganizationSlug;
  create(value: string): OrganizationSlug;
  safe(value: string): OrganizationSlug | null;
  value(slug: OrganizationSlug): string;
  equals(a: OrganizationSlug, b: OrganizationSlug): boolean;
  is(value: unknown): value is OrganizationSlug;
  serialize(slug: OrganizationSlug): string;
}

function validate(value: string): OrganizationSlug {
  const invalidChar = findInvalidSlugChars(value);
  if (invalidChar !== null) {
    throw invalidOrganizationSlugError(
      `contains invalid character "${invalidChar}"`,
    );
  }

  const normalized = normalizeSlug(value);
  if (normalized === null) {
    throw invalidOrganizationSlugError(
      `cannot be normalized to a valid slug`,
    );
  }
  if (!isValidSlugFormat(normalized)) {
    throw invalidOrganizationSlugError(
      `does not match required format`,
    );
  }
  return normalized as OrganizationSlug;
}

export const OrganizationSlug: OrganizationSlugAPI = {
  parse: (value: string) => validate(value),

  create: (value: string) => validate(value),

  safe: (value: string): OrganizationSlug | null => {
    try {
      return validate(value);
    } catch {
      return null;
    }
  },

  value: (slug: OrganizationSlug): string => slug as string,

  equals: (a: OrganizationSlug, b: OrganizationSlug): boolean =>
    (a as string) === (b as string),

  is: (value: unknown): value is OrganizationSlug =>
    typeof value === "string" && isValidSlugFormat(value),

  serialize: (slug: OrganizationSlug): string => slug as string,
};
