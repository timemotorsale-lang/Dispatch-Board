import { defineConfig, devices } from "@playwright/test";
const baseURL = `http://127.0.0.1:${process.env.CASH_PRINT_PREVIEW_PORT || "3111"}`;
export default defineConfig({
  testDir: "./src/tests/fixtures/cash-print", testMatch: ["cash-print-actions.spec.ts", "bhph-vehicle-fields.spec.ts", "bhph-financing.spec.ts", "bhph-payment.spec.ts", "bhph-options.spec.ts", "pathway-change.spec.ts", "print-packs.spec.ts"], workers: 1, reporter: "list", retries: 0,
  outputDir: "test-results/cash-print-actions",
  use: { baseURL, ...devices["Desktop Chrome"], ...(process.platform === "win32" ? { channel: "msedge" } : {}), screenshot: "only-on-failure" },
  webServer: { command: "node scripts/cash-print-preview.mjs", url: baseURL, timeout: 30000, reuseExistingServer: true }
});
