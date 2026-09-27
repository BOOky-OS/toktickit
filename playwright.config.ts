import { defineConfig } from "@playwright/test";

export default defineConfig({
  outputDir: "test-results/legacy",
  testDir: "./e2e",
  testIgnore: ["**/lab-03/real/**", "**/lab-04/**"], // Dedicated real suites have their own configs.
  globalSetup: "./e2e/lab-03/real/setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:5176", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev --workspace client -- --port 5176 --strictPort",
    url: "http://localhost:5176", env: { VITE_API_URL: "http://localhost:3006" }, reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 834, height: 1112 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
