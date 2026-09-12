import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/lab-03", testMatch: "staff-queue.spec.ts", workers: 1, timeout: 30000,
  use: { baseURL: "http://localhost:5175", channel: "chrome" },
  webServer: { command: "npm run dev --workspace client -- --port 5175 --strictPort", url: "http://localhost:5175", reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 834, height: 1112 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
