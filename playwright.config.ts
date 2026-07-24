import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "./tests/fixtures/env";

loadEnvFile();

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseBackedTests = process.env.PAYNEST_TEST_DB_READY === "true";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "**/smoke/**/*.spec.ts",
    "**/auth/**/*.spec.ts",
    "**/rbac/**/*.spec.ts",
    "**/api/**/*.spec.ts",
    "**/flow/**/*.spec.ts",
  ],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI || databaseBackedTests ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI && !databaseBackedTests,
        timeout: 120_000,
        env: {
          NODE_ENV: process.env.NODE_ENV || "test",
          DATABASE_URL: process.env.DATABASE_URL || "",
          DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
          JWT_SECRET: process.env.JWT_SECRET || "test-jwt-secret-change-me",
          PAYNEST_DISABLE_EMAIL: "true",
          RESEND_API_KEY: process.env.RESEND_API_KEY || "re_test_disabled",
          EMAIL_FROM: process.env.EMAIL_FROM || "PayNest Test <noreply@example.test>",
        },
      },
});
