import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Chromium/Desktop Chrome only (per project guidelines).
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
