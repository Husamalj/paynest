import { defineConfig } from "vitest/config";
import { loadEnvFile } from "./tests/fixtures/env";
import path from "node:path";

loadEnvFile();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/vitest.setup.ts"],
    pool: "forks",
  },
});
