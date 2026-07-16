// ── Organization Slug Value Object ─────────────────────────────────────────
// A validated, canonical slug for organizations.
//
// Rules:
//   - Lowercase canonical form (trimmed, normalized)
//   - Only lowercase letters (a-z), digits (0-9), and hyphens (-)
//   - Must start and end with a letter or digit (no leading/trailing hyphens)
//   - No consecutive hyphens
//   - Minimum 1 character, maximum 63 characters
//   - Equality is structural (same normalized value)

// ── Validation constants ──────────────────────────────────────────────────

const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 63;

// Only lowercase letters, digits, and hyphens — no underscores, no uppercase
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ── Brand ─────────────────────────────────────────────────────────────────

type Brand<K extends string, T> = T & { readonly __brand: K };

export type OrganizationSlug = Brand<"OrganizationSlug", string>;

// ── Normalization ─────────────────────────────────────────────────────────

/**
 * Normalize a raw string into canonical slug form.
 *
 * Steps:
 *   1. Trim whitespace
 *   2. Lowercase
 *   3. Replace spaces and underscores with hyphens
 *   4. Strip characters that aren't a-z, 0-9, or hyphen
 *   5. Collapse consecutive hyphens into one
 *   6. Strip leading/trailing hyphens
 *
 * Returns null if normalization produces an empty string.
 */
export function normalizeSlug(raw: string): string | null {
  if (typeof raw !== "string") return null;

  let normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/g, "") // strip invalid chars
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
  /**
   * Parse and validate a raw string into an OrganizationSlug.
   * Normalizes the input (lowercase, trim, collapse separators).
   * Throws on invalid input.
   */
  parse(value: string): OrganizationSlug;

  /**
   * Create an OrganizationSlug from a raw string.
   * Alias for parse — semantically signals intent to create a new slug.
   */
  create(value: string): OrganizationSlug;

  /**
   * Attempt to parse, returning null on invalid input.
   */
  safe(value: string): OrganizationSlug | null;

  /**
   * Extract the string value from a branded slug.
   */
  value(slug: OrganizationSlug): string;

  /**
   * Structural equality — same normalized value = equal.
   */
  equals(a: OrganizationSlug, b: OrganizationSlug): boolean;

  /**
   * Type guard.
   */
  is(value: unknown): value is OrganizationSlug;

  /**
   * Serialize back to string.
   */
  serialize(slug: OrganizationSlug): string;
}

function validate(value: string): OrganizationSlug {
  const normalized = normalizeSlug(value);
  if (normalized === null) {
    throw new Error(
      `Invalid OrganizationSlug: "${value}" cannot be normalized to a valid slug`,
    );
  }
  if (!isValidSlugFormat(normalized)) {
    throw new Error(
      `Invalid OrganizationSlug: "${normalized}" does not match required format`,
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
