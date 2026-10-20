import { expect, test } from "@playwright/test";
import { assertLaborStagingTarget } from "../../../scripts/lib/labor-staging-target.mjs";

test.setTimeout(120_000);

test.beforeAll(() => {
  if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Use the isolated labor staging runner, not an ordinary development or production server.");
  assertLaborStagingTarget(process.env.DATABASE_URL ?? "");
  if (process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3200") throw new Error("The labor staging browser must use its isolated local server.");
});

test("real authentication, manager-only approval settings and the expanded review catalog", async ({ page, request }) => {
  expect((await request.get("/api/settings/labor-catalog")).status()).toBe(401);
  const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
  expect(login.ok()).toBe(true);
  const settings = await page.request.get("/api/settings/labor-catalog");
  expect(settings.ok()).toBe(true);
  expect(settings.headers()["cache-control"]).toContain("no-store");
  const body = await settings.json();
  expect(body.allowedSystemIds).toEqual(["brakes", "steering"]);
  expect(body.systems).toHaveLength(10);
  expect(body.systems.reduce((total: number, system: { operations: number }) => total + system.operations, 0)).toBe(1080);
  await page.goto("/settings/labor-catalog");
  await expect(page.getByRole("heading", { name: "Expanded catalog approvals" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create catalog policy draft" })).toBeDisabled();
  await page.goto("/prototype/repair-explorer?system=ev&group=ev-battery");
  await expect(page.getByRole("button", { name: "Add Replace high-voltage battery assembly", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diagnose a concern", exact: true }).click();
  await expect(page.getByRole("button", { name: "Diagnose a concern", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/labor-staging/authenticated-catalog.png", fullPage: true, caret: "initial" });
  await page.request.post("/api/auth/logout");
  expect((await page.request.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
  expect((await page.request.get("/api/settings/labor-catalog")).status()).toBe(403);
  expect((await page.request.post("/api/settings/labor-catalog", { data: { action: "CREATE_POLICY_DRAFT" } })).status()).toBe(403);
});
