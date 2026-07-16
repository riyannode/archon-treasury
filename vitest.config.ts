import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@archon-treasury/domain": path.resolve(
        __dirname,
        "packages/domain/src/index.ts",
      ),
    },
  },
  test: {
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/integration.test.ts"],
  },
});
