import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Isolated schemas share the database-wide security advisory lock. Run
    // suites serially; each concurrency test still sends simultaneous requests.
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
  },
});
