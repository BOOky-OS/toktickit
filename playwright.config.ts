import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:5173", channel: "chrome", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run dev:server", url: "http://127.0.0.1:3000/api/health", reuseExistingServer: true, timeout: 60_000 },
    { command: "npm run dev:client", url: "http://localhost:5173", reuseExistingServer: true, timeout: 60_000 },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 834, height: 1112 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
