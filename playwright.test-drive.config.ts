import { defineConfig, devices } from "@playwright/test";
const previewUrl = `http://127.0.0.1:${process.env.TEST_DRIVE_PREVIEW_PORT || "3107"}`;
export default defineConfig({
  testDir: "./src/tests/e2e", testMatch: "guided-test-drive.spec.ts", workers: 1, retries: 0,
  reporter: "list", outputDir: "test-results/guided-test-drive",
  use: { baseURL: previewUrl, ...devices["Desktop Chrome"], ...(process.platform === "win32" ? { channel: "msedge" } : {}), screenshot: "only-on-failure" },
  webServer: { command: "node scripts/test-drive-preview.mjs", url: previewUrl, reuseExistingServer: true, timeout: 30000 }
});
