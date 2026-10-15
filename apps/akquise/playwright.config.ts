import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3100",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
