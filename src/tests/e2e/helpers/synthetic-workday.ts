import { expect, type Page } from "@playwright/test";
import { assertLaborStagingTarget } from "../../../../scripts/lib/labor-staging-target.mjs";

export async function explainSyntheticWorkdayDelay(page: Page, sourcePath: string, reason: string) {
  if (process.env.LABOR_STAGING_CONFIRM !== "isolated" || !["http://127.0.0.1:3200", "http://127.0.0.1:3198"].includes(process.env.PLAYWRIGHT_BASE_URL ?? "")) throw new Error("Synthetic workday preparation requires isolated staging.");
  assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
  await recordSyntheticDelay(page, sourcePath, reason);
}

export async function prepareIsolatedRepairWorkday(page: Page, sourcePath: string) {
  const database = new URL(process.env.DATABASE_URL ?? "");
  const preview = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "");
  if (database.hostname !== "127.0.0.1" || preview.hostname !== "127.0.0.1" ||
    !database.searchParams.get("schema")?.startsWith("dispatch_board_e2e_")) {
    throw new Error("Repair workday preparation requires an isolated local schema and preview.");
  }
  await recordSyntheticDelay(page, sourcePath, "Synthetic repair verification in the isolated browser test.");
}

async function recordSyntheticDelay(page: Page, sourcePath: string, reason: string) {
  const response = await page.request.get("/api/coo-workbook/rhythm");
  expect(response.ok()).toBe(true);
  const rhythm = await response.json();
  const explained = await page.request.post("/api/coo-workbook/rhythm", { data: { workbookId: rhythm.workbookId, action: "START_DELAY_EXPLAINED", reason, sourcePath } });
  expect(explained.ok()).toBe(true);
  const refreshed = await page.request.get("/api/coo-workbook/rhythm");
  expect(refreshed.ok()).toBe(true);
  const current = await refreshed.json();
  expect(current.operatingRhythm.startTheDay.state).not.toBe("LOCKED_UNTIL_REASON");
  await page.addInitScript(({ key, until }) => window.localStorage.setItem(key, String(until)), {
    key: `operating-rhythm:start-snooze:${current.boardDate}:${current.workbookId}`,
    until: Date.now() + 15 * 60 * 1000
  });
}
