// ── Organization Slug Value Object ─────────────────────────────────────────
// A validated, canonical slug for organizations.
//
// Normalization (single O(n) scan, no regex on uncontrolled input):
//   1. Reject raw input > 256 chars (pre-DoS)
//   2. Trim ASCII whitespace, lowercase
//   3. Only ASCII space " " and underscore "_" are separators → hyphen
//   4. Collapse consecutive hyphens
//   5. Trim leading/trailing hyphens
//
// Validation (after normalization, also regex-free):
//   - Only lowercase letters (a-z), digits (0-9), and hyphens (-)
//   - No leading/trailing hyphen, no consecutive hyphens
//   - Minimum 1 character, maximum 63 characters
//
// Characters NOT in [a-z0-9_ ] cause rejection — they are NOT stripped.
// Tab, newline, carriage return, and Unicode whitespace are rejected.
// "archon!" → rejected (not "archon")
// "pay$labs" → rejected (not "paylabs")

import { invalidOrganizationSlugError } from "./errors.js";

// ── Constants ──────────────────────────────────────────────────────────────

const SLUG_MIN_LENGTH = 1;
const SLUG_MAX_LENGTH = 63;

/** Reject raw input longer than this before any processing (DoS prevention). */
const SLUG_MAX_RAW_LENGTH = 256;

// ── Brand ─────────────────────────────────────────────────────────────────

type Brand<K extends string, T> = T & { readonly __brand: K };

export type OrganizationSlug = Brand<"OrganizationSlug", string>;

// ── Regex-free normalization (single linear scan) ─────────────────────────

/**
 * Normalize a raw string into canonical slug form.
 *
 * Uses a single O(n) scan — no regex applied to uncontrolled input.
 * Only ASCII space " " and underscore "_" are treated as separators.
 * Tab, newline, carriage return, and Unicode whitespace are rejected.
 *
 * Returns null if:
 *   - input is not a string
 *   - raw length exceeds 256 (DoS guard)
 *   - input contains invalid characters
 *   - normalization produces empty string
 *   - result exceeds 63 characters
 */
export function normalizeSlug(raw: string): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > SLUG_MAX_RAW_LENGTH) return null;

  const input = raw.trim().toLowerCase();
  if (input.length === 0) return null;

  let output = "";
  let pendingSeparator = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    const isLetter = (char >= "a" && char <= "z");
    const isDigit = (char >= "0" && char <= "9");
    // Space, underscore, and hyphen are separators → collapse to hyphen
    const isSeparator = char === " " || char === "_" || char === "-";

    if (isLetter || isDigit) {
      if (pendingSeparator && output.length > 0) {
        output += "-";
      }
      output += char;
      pendingSeparator = false;

      if (output.length > SLUG_MAX_LENGTH) return null;
      continue;
    }

    if (isSeparator) {
      if (output.length > 0) {
        pendingSeparator = true;
      }
      continue;
    }

    // Any other character (including tab, newline, -, punctuation, Unicode) → invalid
    return null;
  }

  return output.length > 0 ? output : null;
}

// ── Regex-free canonical validation ───────────────────────────────────────

/**
 * Validate that a string is already in canonical slug form.
 * No regex — character-by-character check.
 */
function isValidCanonicalSlug(value: string): boolean {
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) {
    return false;
  }

  let previousWasHyphen = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i]!;
    const isLetter = char >= "a" && char <= "z";
    const isDigit = char >= "0" && char <= "9";

    if (isLetter || isDigit) {
      previousWasHyphen = false;
      continue;
    }

    if (
      char === "-" &&
      i > 0 &&
      i < value.length - 1 &&
      !previousWasHyphen
    ) {
      previousWasHyphen = true;
      continue;
    }

    return false;
  }

  return true;
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
  const normalized = normalizeSlug(value);
  if (normalized === null) {
    throw invalidOrganizationSlugError("invalid slug value");
  }
  if (!isValidCanonicalSlug(normalized)) {
    throw invalidOrganizationSlugError("does not match required format");
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
    typeof value === "string" && isValidCanonicalSlug(value),

  serialize: (slug: OrganizationSlug): string => slug as string,
};
