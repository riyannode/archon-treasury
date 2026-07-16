// ── Typed Identifiers ─────────────────────────────────────────────────────────
// Opaque branded types for domain identity. Each identifier is:
//   - Constructed from a valid UUID string (v4 or v7)
//   - Validated for correct UUID format (RFC 4122 variant)
//   - Serializable back to string
//   - Type-safe (OrganizationId cannot be used as TreasuryId)
//   - Immutable
//   - Database-independent

// UUID format: 8-4-4-4-12 hex chars, hyphen-separated
// Version nibble: must be 4 (v4) or 7 (v7)
// Variant bits: must be 8, 9, a, or b (RFC 4122)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Allowed versions: 4 and 7
const VALID_VERSIONS = new Set(["4", "7"]);

function isValidUuid(value: string): boolean {
  if (!UUID_RE.test(value)) {
    return false;
  }
  // Check version nibble (position 14, after second hyphen)
  const version = value[14]!;
  return VALID_VERSIONS.has(version);
}

// ── Base identifier factory ──────────────────────────────────────────────────

type Brand<K extends string, T> = T & { readonly __brand: K };

interface IdentifierConfig<K extends string> {
  readonly brand: K;
  readonly errorMessage: string;
}

function createIdentifier<K extends string, T extends string>(
  config: IdentifierConfig<K>,
): {
  parse: (value: string) => Brand<K, T>;
  safe: (value: string) => Brand<K, T> | null;
  serialize: (id: Brand<K, T>) => string;
  is: (value: unknown) => value is Brand<K, T>;
} {
  const { errorMessage } = config;

  function validate(value: string): Brand<K, T> {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(errorMessage);
    }
    if (!isValidUuid(value)) {
      throw new Error(errorMessage);
    }
    return value as Brand<K, T>;
  }

  return {
    parse: (value: string) => validate(value),
    safe: (value: string) => {
      try {
        return validate(value);
      } catch {
        return null;
      }
    },
    serialize: (id: Brand<K, T>) => id as string,
    is: (value: unknown): value is Brand<K, T> =>
      typeof value === "string" && isValidUuid(value as string),
  };
}

// ── Identifier types ─────────────────────────────────────────────────────────

export type UserId = Brand<"UserId", string>;
export type OrganizationId = Brand<"OrganizationId", string>;
export type MembershipId = Brand<"MembershipId", string>;
export type TreasuryId = Brand<"TreasuryId", string>;
export type WalletId = Brand<"WalletId", string>;

// ── Identifier constructors ──────────────────────────────────────────────────

export const UserId = createIdentifier<"UserId", UserId>({
  brand: "UserId",
  errorMessage: "Invalid UserId: must be a valid UUID string",
});

export const OrganizationId = createIdentifier<
  "OrganizationId",
  OrganizationId
>({
  brand: "OrganizationId",
  errorMessage: "Invalid OrganizationId: must be a valid UUID string",
});

export const MembershipId = createIdentifier<"MembershipId", MembershipId>({
  brand: "MembershipId",
  errorMessage: "Invalid MembershipId: must be a valid UUID string",
});

export const TreasuryId = createIdentifier<"TreasuryId", TreasuryId>({
  brand: "TreasuryId",
  errorMessage: "Invalid TreasuryId: must be a valid UUID string",
});

export const WalletId = createIdentifier<"WalletId", WalletId>({
  brand: "WalletId",
  errorMessage: "Invalid WalletId: must be a valid UUID string",
});

// Re-export Brand type for consumers
export type { Brand };
