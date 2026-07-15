import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./index.js";

describe("loadConfig", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save and clear relevant env vars
    for (const key of ["NODE_ENV", "PORT", "API_PORT", "LOG_LEVEL", "DATABASE_URL"]) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore
    for (const key of Object.keys(envBackup)) {
      if (envBackup[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envBackup[key];
      }
    }
  });

  it("returns defaults when env is empty", () => {
    const config = loadConfig();
    expect(config.nodeEnv).toBe("development");
    expect(config.port).toBe(3000);
    expect(config.apiPort).toBe(3002);
    expect(config.logLevel).toBe("info");
  });

  it("reads from environment variables", () => {
    process.env["NODE_ENV"] = "staging";
    process.env["PORT"] = "8080";

    const config = loadConfig();
    expect(config.nodeEnv).toBe("staging");
    expect(config.port).toBe(8080);
  });
});
