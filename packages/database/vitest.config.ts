import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@archon-treasury/domain": path.resolve(
        __dirname,
        "../domain/src/index.ts",
      ),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/*.integration.test.ts",
      "**/integration.test.ts",
      "node_modules",
      "dist",
    ],
  },
});
