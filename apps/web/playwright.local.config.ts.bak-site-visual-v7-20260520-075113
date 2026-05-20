import { defineConfig, devices } from "@playwright/test";

const outputDir = process.env.ASTRO_PLAYWRIGHT_OUTPUT_DIR || "./.playwright-output";
const htmlReportDir = process.env.ASTRO_PLAYWRIGHT_HTML_REPORT || "playwright-report";

export default defineConfig({
  testDir: "./tests",
  outputDir,
  timeout: 25_000,
  globalTimeout: 180_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: htmlReportDir, open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 12_000,
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],
});