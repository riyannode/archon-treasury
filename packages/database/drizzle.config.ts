import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Uses DATABASE_URL from environment — never hardcoded credentials.
 * This config is used by CLI commands (db:generate, db:migrate, etc.)
 * and is NOT imported by application code at runtime.
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
