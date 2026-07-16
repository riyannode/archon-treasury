import { envSchema, type RawEnv } from "./env.js";

/**
 * Fully typed, validated application configuration.
 * Derived from the Zod env schema — single source of truth.
 */
export type AppConfig = {
  nodeEnv: RawEnv["NODE_ENV"];
  port: number;
  logLevel: RawEnv["LOG_LEVEL"];
  databaseUrl?: string;
  databasePoolMin?: number;
  databasePoolMax?: number;
  databaseIdleTimeoutMs?: number;
  databaseConnectionTimeoutMs?: number;
  databaseSslMode?: "disable" | "require";
  circleApiKey?: string;
};

/**
 * Parse environment variables and return a validated AppConfig.
 *
 * Fail-fast: throws ZodError if required values are missing or malformed.
 * Call once at process startup — not per-request.
 */
export function loadConfig(
  source: Record<string, unknown> = process.env,
): AppConfig {
  const env = envSchema.parse(source);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    ...(env.DATABASE_URL !== undefined && { databaseUrl: env.DATABASE_URL }),
    ...(env.DATABASE_POOL_MIN !== undefined && { databasePoolMin: env.DATABASE_POOL_MIN }),
    ...(env.DATABASE_POOL_MAX !== undefined && { databasePoolMax: env.DATABASE_POOL_MAX }),
    ...(env.DATABASE_IDLE_TIMEOUT_MS !== undefined && { databaseIdleTimeoutMs: env.DATABASE_IDLE_TIMEOUT_MS }),
    ...(env.DATABASE_CONNECTION_TIMEOUT_MS !== undefined && { databaseConnectionTimeoutMs: env.DATABASE_CONNECTION_TIMEOUT_MS }),
    ...(env.DATABASE_SSL_MODE !== undefined && { databaseSslMode: env.DATABASE_SSL_MODE }),
    ...(env.CIRCLE_API_KEY !== undefined && { circleApiKey: env.CIRCLE_API_KEY }),
  };
}

// Re-export env utilities for downstream consumers
export { envSchema, parseEnv } from "./env.js";
export type { RawEnv } from "./env.js";
