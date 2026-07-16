import { z } from "zod";

/**
 * Normalizer: empty string → undefined, non-empty string kept.
 * Prevents silent "" values for optional secrets that aren't configured.
 */
const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * Zod schema for environment variables.
 *
 * - NODE_ENV, PORT, LOG_LEVEL have defaults
 * - DATABASE_URL and CIRCLE_API_KEY are truly optional (undefined when unset)
 * - DATABASE_POOL_* are optional with safe defaults
 * - Fail-fast: parse() throws on invalid values
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "staging",
      "production-testnet",
      "production-mainnet",
    ])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: optionalNonEmptyString,

  // Pool settings — optional with safe defaults
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).max(100).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).optional(),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).optional(),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).optional(),

  CIRCLE_API_KEY: optionalNonEmptyString,
});

export type RawEnv = z.infer<typeof envSchema>;

/**
 * Parse and validate process.env against the schema.
 * Throws a descriptive ZodError on invalid/missing required values.
 */
export function parseEnv(
  source: Record<string, unknown> = process.env,
): RawEnv {
  return envSchema.parse(source);
}
