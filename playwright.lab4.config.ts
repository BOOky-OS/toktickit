import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/lab-04", globalSetup: "./e2e/lab-04/setup.ts", workers: 1, fullyParallel: false,
  timeout: 60_000, reporter: "list",
  use: { actionTimeout: 15_000, baseURL: "http://localhost:5177", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "npm run dev --workspace client -- --port 5177 --strictPort", url: "http://localhost:5177",
    env: { VITE_API_URL: "http://localhost:3007" }, reuseExistingServer: false },
});
