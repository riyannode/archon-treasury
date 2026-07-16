import { z } from "zod";

/**
 * Database connection configuration.
 *
 * Derived from environment variables validated by @archon-treasury/config.
 * Credentials are never logged or exported in plaintext.
 */

export const databaseConfigSchema = z.object({
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  poolMin: z.coerce.number().int().min(0).max(100).default(0),
  poolMax: z.coerce.number().int().min(1).max(100).default(10),
  idleTimeoutMs: z.coerce.number().int().min(1000).max(300_000).default(10_000),
  connectionTimeoutMs: z.coerce.number().int().min(1000).max(60_000).default(5_000),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

/**
 * Build database config from validated AppConfig or raw env.
 * Extracts pool settings from process.env with safe defaults.
 */
export function buildDatabaseConfig(
  databaseUrl: string,
  env: Record<string, unknown> = process.env,
): DatabaseConfig {
  return databaseConfigSchema.parse({
    databaseUrl,
    poolMin: env["DATABASE_POOL_MIN"],
    poolMax: env["DATABASE_POOL_MAX"],
    idleTimeoutMs: env["DATABASE_IDLE_TIMEOUT_MS"],
    connectionTimeoutMs: env["DATABASE_CONNECTION_TIMEOUT_MS"],
  });
}
