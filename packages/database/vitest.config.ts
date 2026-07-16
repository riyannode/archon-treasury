import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/integration.test.ts",
      "node_modules",
      "dist",
    ],
  },
});
