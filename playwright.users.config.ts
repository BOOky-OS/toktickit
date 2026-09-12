import queue from "./playwright.queue.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({ ...queue, testMatch: "users.spec.ts" });
