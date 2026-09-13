import { defineConfig } from "@playwright/test";

// Dedicated ports and a disposable database schema; never reuse the working app.
export default defineConfig({
  testDir: "./e2e/lab-03/real",
  globalSetup: "./e2e/lab-03/real/setup.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: "list",
  use: { actionTimeout: 15_000, baseURL: "http://localhost:5176", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev --workspace client -- --port 5176 --strictPort",
    url: "http://localhost:5176",
    env: { VITE_API_URL: "http://localhost:3006" },
    reuseExistingServer: false,
  },
});
