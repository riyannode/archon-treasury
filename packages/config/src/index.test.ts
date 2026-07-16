import { describe, it, expect } from "vitest";
import { loadConfig } from "./index.js";
import { envSchema, parseEnv } from "./env.js";

// Helper: create a clean env record with only the specified keys
function cleanEnv(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    NODE_ENV: "development",
    PORT: "3000",
    LOG_LEVEL: "info",
    ...overrides,
  };
}

describe("envSchema", () => {
  it("parses valid environment with all fields", () => {
    const result = envSchema.parse(
      cleanEnv({
        NODE_ENV: "production-mainnet",
        PORT: "8080",
        LOG_LEVEL: "warn",
        DATABASE_URL: "postgres://localhost/archon",
        CIRCLE_API_KEY: "test-key",
      }),
    );
    expect(result.NODE_ENV).toBe("production-mainnet");
    expect(result.PORT).toBe(8080);
    expect(result.LOG_LEVEL).toBe("warn");
    expect(result.DATABASE_URL).toBe("postgres://localhost/archon");
    expect(result.CIRCLE_API_KEY).toBe("test-key");
  });

  it("applies defaults when optional/numeric fields are absent", () => {
    const result = envSchema.parse({});
    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe(3000);
    expect(result.LOG_LEVEL).toBe("info");
    expect(result.DATABASE_URL).toBeUndefined();
    expect(result.CIRCLE_API_KEY).toBeUndefined();
  });

  it("parses DATABASE_POOL_MIN/MAX when provided", () => {
    const result = envSchema.parse(
      cleanEnv({
        DATABASE_URL: "postgres://localhost/archon",
        DATABASE_POOL_MIN: "2",
        DATABASE_POOL_MAX: "20",
      }),
    );
    expect(result.DATABASE_POOL_MIN).toBe(2);
    expect(result.DATABASE_POOL_MAX).toBe(20);
  });

  it("DATABASE_POOL_MIN/MAX undefined when absent", () => {
    const result = envSchema.parse(cleanEnv());
    expect(result.DATABASE_POOL_MIN).toBeUndefined();
    expect(result.DATABASE_POOL_MAX).toBeUndefined();
  });

  it("parses DATABASE_IDLE_TIMEOUT_MS and DATABASE_CONNECTION_TIMEOUT_MS", () => {
    const result = envSchema.parse(
      cleanEnv({
        DATABASE_IDLE_TIMEOUT_MS: "30000",
        DATABASE_CONNECTION_TIMEOUT_MS: "10000",
      }),
    );
    expect(result.DATABASE_IDLE_TIMEOUT_MS).toBe(30000);
    expect(result.DATABASE_CONNECTION_TIMEOUT_MS).toBe(10000);
  });
});

describe("loadConfig", () => {
  it("returns typed config from valid env", () => {
    const config = loadConfig(
      cleanEnv({
        NODE_ENV: "staging",
        PORT: "4000",
        LOG_LEVEL: "debug",
      }),
    );
    expect(config.nodeEnv).toBe("staging");
    expect(config.port).toBe(4000);
    expect(config.logLevel).toBe("debug");
    expect(config.databaseUrl).toBeUndefined();
    expect(config.circleApiKey).toBeUndefined();
  });

  it("includes optional fields when provided", () => {
    const config = loadConfig(
      cleanEnv({
        DATABASE_URL: "postgres://db:5432/archon",
        CIRCLE_API_KEY: "sec_test_123",
      }),
    );
    expect(config.databaseUrl).toBe("postgres://db:5432/archon");
    expect(config.circleApiKey).toBe("sec_test_123");
  });

  it("includes database pool settings when provided", () => {
    const config = loadConfig(
      cleanEnv({
        DATABASE_URL: "postgres://db:5432/archon",
        DATABASE_POOL_MIN: "1",
        DATABASE_POOL_MAX: "15",
        DATABASE_IDLE_TIMEOUT_MS: "20000",
        DATABASE_CONNECTION_TIMEOUT_MS: "8000",
      }),
    );
    expect(config.databasePoolMin).toBe(1);
    expect(config.databasePoolMax).toBe(15);
    expect(config.databaseIdleTimeoutMs).toBe(20000);
    expect(config.databaseConnectionTimeoutMs).toBe(8000);
  });

  it("pool settings undefined when absent", () => {
    const config = loadConfig(cleanEnv());
    expect(config.databasePoolMin).toBeUndefined();
    expect(config.databasePoolMax).toBeUndefined();
    expect(config.databaseIdleTimeoutMs).toBeUndefined();
    expect(config.databaseConnectionTimeoutMs).toBeUndefined();
  });

  it("uses defaults for missing fields", () => {
    const config = loadConfig({});
    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe("info");
  });

  it("coerces PORT string to number", () => {
    const config = loadConfig(cleanEnv({ PORT: "9090" }));
    expect(config.port).toBe(9090);
    expect(typeof config.port).toBe("number");
  });

  it("rejects invalid NODE_ENV", () => {
    expect(() => loadConfig(cleanEnv({ NODE_ENV: "invalid" }))).toThrow();
  });

  it("rejects negative PORT", () => {
    expect(() => loadConfig(cleanEnv({ PORT: "-1" }))).toThrow();
  });

  it("rejects non-numeric PORT", () => {
    expect(() => loadConfig(cleanEnv({ PORT: "abc" }))).toThrow();
  });

  it("rejects zero PORT", () => {
    expect(() => loadConfig(cleanEnv({ PORT: "0" }))).toThrow();
  });

  it("rejects non-integer PORT", () => {
    expect(() => loadConfig(cleanEnv({ PORT: "3000.5" }))).toThrow();
  });

  it("rejects invalid LOG_LEVEL", () => {
    expect(() => loadConfig(cleanEnv({ LOG_LEVEL: "verbose" }))).toThrow();
  });

  it("accepts all valid NODE_ENV values", () => {
    const validEnvs = [
      "development",
      "staging",
      "production-testnet",
      "production-mainnet",
    ];
    for (const env of validEnvs) {
      const config = loadConfig(cleanEnv({ NODE_ENV: env }));
      expect(config.nodeEnv).toBe(env);
    }
  });

  it("accepts all valid LOG_LEVEL values", () => {
    const validLevels = ["debug", "info", "warn", "error"];
    for (const level of validLevels) {
      const config = loadConfig(cleanEnv({ LOG_LEVEL: level }));
      expect(config.logLevel).toBe(level);
    }
  });

  // --- Optional secret normalization tests ---

  it("DATABASE_URL missing → undefined", () => {
    const config = loadConfig(cleanEnv());
    expect(config.databaseUrl).toBeUndefined();
  });

  it("DATABASE_URL empty string → undefined", () => {
    const config = loadConfig(cleanEnv({ DATABASE_URL: "" }));
    expect(config.databaseUrl).toBeUndefined();
  });

  it("DATABASE_URL non-empty string → kept", () => {
    const config = loadConfig(
      cleanEnv({ DATABASE_URL: "postgres://localhost/archon" }),
    );
    expect(config.databaseUrl).toBe("postgres://localhost/archon");
  });

  it("CIRCLE_API_KEY missing → undefined", () => {
    const config = loadConfig(cleanEnv());
    expect(config.circleApiKey).toBeUndefined();
  });

  it("CIRCLE_API_KEY empty string → undefined", () => {
    const config = loadConfig(cleanEnv({ CIRCLE_API_KEY: "" }));
    expect(config.circleApiKey).toBeUndefined();
  });

  it("CIRCLE_API_KEY non-empty string → kept", () => {
    const config = loadConfig(cleanEnv({ CIRCLE_API_KEY: "sec_abc123" }));
    expect(config.circleApiKey).toBe("sec_abc123");
  });
});

describe("parseEnv", () => {
  it("returns RawEnv type from valid input", () => {
    const env = parseEnv(cleanEnv());
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
  });

  it("throws ZodError on invalid input", () => {
    expect(() => parseEnv({ NODE_ENV: "bogus" })).toThrow();
  });
});
