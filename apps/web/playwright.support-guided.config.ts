import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/support-guided" }],
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    trace: "on",
    screenshot: "on",
    video: "retain-on-failure",
    launchOptions: {
      slowMo: 250,
    },
  }
});