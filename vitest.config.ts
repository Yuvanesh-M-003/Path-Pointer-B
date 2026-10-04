import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    // DB-backed tests run serially to avoid cross-test data races.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
