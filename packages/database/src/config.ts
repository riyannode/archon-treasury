import { z } from "zod";

/**
 * Database connection configuration.
 *
 * All values are provided explicitly — never reads process.env.
 * Credentials are never logged or exported in plaintext.
 */

const sslModeSchema = z.enum(["disable", "require"]).default("disable");

export const databaseConfigSchema = z.object({
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  poolMin: z.coerce.number().int().min(0).max(100).default(0),
  poolMax: z.coerce.number().int().min(1).max(100).default(10),
  idleTimeoutMs: z.coerce.number().int().min(1000).max(300_000).default(10_000),
  connectionTimeoutMs: z.coerce.number().int().min(1000).max(60_000).default(5_000),
  sslMode: sslModeSchema,
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type SslMode = z.infer<typeof sslModeSchema>;

/**
 * Build and validate database config from explicit properties.
 *
 * All values must be provided by the caller (typically packages/config loadConfig).
 * This function NEVER reads process.env — ambient env reads belong only in
 * @archon-treasury/config.
 */
export function buildDatabaseConfig(input: {
  databaseUrl: string;
  poolMin?: number;
  poolMax?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  sslMode?: SslMode;
}): DatabaseConfig {
  return databaseConfigSchema.parse(input);
}
