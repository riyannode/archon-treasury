// ── Typed Identifiers ─────────────────────────────────────────────────────────
// Opaque branded types for domain identity. Each identifier is:
//   - Constructed from a UUID string
//   - Validated for UUID v4 format
//   - Serializable back to string
//   - Type-safe (OrganizationId cannot be used as TreasuryId)
//   - Immutable
//   - Database-independent

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    if (!UUID_V4_RE.test(value)) {
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
      typeof value === "string" && UUID_V4_RE.test(value as string),
  };
}

// ── Identifier types ─────────────────────────────────────────────────────────

export type UserId = Brand<"UserId", string>;
export type OrganizationId = Brand<"OrganizationId", string>;
export type TreasuryId = Brand<"TreasuryId", string>;
export type WalletId = Brand<"WalletId", string>;

// ── Identifier constructors ──────────────────────────────────────────────────

export const UserId = createIdentifier<"UserId", UserId>({
  brand: "UserId",
  errorMessage: "Invalid UserId: must be a UUID v4 string",
});

export const OrganizationId = createIdentifier<
  "OrganizationId",
  OrganizationId
>({
  brand: "OrganizationId",
  errorMessage: "Invalid OrganizationId: must be a UUID v4 string",
});

export const TreasuryId = createIdentifier<"TreasuryId", TreasuryId>({
  brand: "TreasuryId",
  errorMessage: "Invalid TreasuryId: must be a UUID v4 string",
});

export const WalletId = createIdentifier<"WalletId", WalletId>({
  brand: "WalletId",
  errorMessage: "Invalid WalletId: must be a UUID v4 string",
});

// Re-export Brand type for consumers
export type { Brand };
