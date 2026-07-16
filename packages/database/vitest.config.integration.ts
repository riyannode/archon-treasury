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
    fileParallelism: false,
    include: ["src/**/integration.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
