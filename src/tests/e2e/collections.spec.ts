/**
 * Collections browser tests: every screen at desktop and phone width, accessibility (axe),
 * a real workflow (log contact, record promise, preview a dry-run text, save settings) and
 * the collector's restrictions.
 *
 * Needs the local Collections test database and a server started with
 * COLLECTIONS_MODULE=LIVE and COLLECTIONS_SMS_SENDING=DRY_RUN. See docs/COLLECTIONS_BUILD_LOG.md (Stage 11).
 *   npx tsx scripts/collections-e2e-fixture.ts
 *   RUN_COLLECTIONS_BROWSER=1 PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npx playwright test collections
 */
import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.skip(process.env.RUN_COLLECTIONS_BROWSER !== "1", "Requires the local Collections test database and fixture.");

type Fixture = { organizationId: string; adminToken: string; collectorToken: string; accountId: string };
const fixture = (): Fixture => JSON.parse(readFileSync("tmp/collections/browser-fixture.json", "utf8"));

async function signedIn(context: BrowserContext, token: string, baseURL: string) {
  await context.addCookies([{ name: "dispatch-board-session", value: token, url: baseURL }]);
  // The app-wide "Start The Day" reminder isn't part of Collections; keep it out of the way (as other browser tests do).
  await context.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Operating rhythm outside this Collections test." } }));
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  return errors;
}

async function checkPage(page: Page, path: string, heading: string | RegExp, name: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should load`).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible({ timeout: 30_000 });
  const axe = await new AxeBuilder({ page }).include("[data-collections-page]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => `${n.target.join(" ")} (${n.any[0]?.message ?? ""})`).join(" | ")}`), `${path} accessibility`).toEqual([]);
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-collections-page]") as HTMLElement | null;
      return root ? root.scrollWidth - root.clientWidth : 0;
    });
    expect(overflow, `${path} should not scroll sideways at ${width}px`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
}

test.describe("Collections screens", () => {
  test.describe.configure({ mode: "serial" });

  test("every screen loads, is accessible, and fits a phone", async ({ browser, baseURL }) => {
    test.setTimeout(300_000);
    const f = fixture();
    const context = await browser.newContext();
    await signedIn(context, f.adminToken, baseURL!);
    const page = await context.newPage();
    const errors = watchErrors(page);
    await checkPage(page, "/collections", "Today's collections queue", "queue");
    await checkPage(page, "/collections?tab=REPO", "Today's collections queue", "queue-repo");
    await checkPage(page, "/collections/accounts", /Accounts/, "accounts");
    await checkPage(page, `/collections/accounts/${f.accountId}`, /SAMPLE|Sample|FAKE|\w+/, "account");
    await checkPage(page, "/collections/inbox", "Inbox", "inbox");
    await checkPage(page, "/collections/import", /Import/, "import");
    await checkPage(page, "/collections/dashboard", "Collections dashboard", "dashboard");
    await checkPage(page, "/collections/settings", "Collections settings", "settings");
    await checkPage(page, "/collections/playbook", "Collections playbook", "playbook");
    await checkPage(page, "/collections/integrations", "Integrations", "integrations");
    await checkPage(page, "/collections/reconciliation?filter=ALL", "Reconciliation", "reconciliation");
    expect(errors).toEqual([]);
    await context.close();
  });

  test("an admin works an account: contact, promise, dry-run text, settings", async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const f = fixture();
    const context = await browser.newContext();
    await signedIn(context, f.adminToken, baseURL!);
    const page = await context.newPage();
    const errors = watchErrors(page);
    page.setDefaultTimeout(20_000);

    await page.goto(`/collections/accounts/${f.accountId}`);
    const promise = page.locator("#promise");
    await promise.getByLabel("Amount ($)").first().fill("125");
    await promise.getByLabel("Promised date").fill(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
    await promise.getByRole("button", { name: "Save promise" }).click();
    await expect(promise.getByRole("status")).toBeVisible();
    await expect(promise.getByText("$125.00").first()).toBeVisible();

    const message = page.locator("#message");
    await message.getByLabel("Template").selectOption("PAST_DUE_DAY1");
    await message.getByRole("button", { name: "Preview" }).click();
    await expect(message.getByText(/Reply STOP to opt out/).first()).toBeVisible();

    await page.goto("/collections/settings");
    await page.getByLabel("Zelle recipient").fill("payments@example.test");
    await page.getByLabel("What changed and why (saved in the history)").fill("Browser test");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status")).toContainText(/saved|Nothing changed/);

    await page.goto("/collections/dashboard");
    const csv = await page.request.get("/api/collections/dashboard?format=csv&table=buckets");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Bucket,Accounts");
    expect(errors).toEqual([]);
    await context.close();
  });

  test("a collector can work accounts but not change settings or approve", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const f = fixture();
    const context = await browser.newContext();
    await signedIn(context, f.collectorToken, baseURL!);
    const page = await context.newPage();
    await page.goto("/collections");
    await expect(page.getByRole("heading", { level: 1, name: "Today's collections queue" })).toBeVisible({ timeout: 30_000 });
    expect((await page.request.get("/api/collections/settings")).status()).toBe(403);
    const menu = page.getByRole("navigation", { name: "Collections" });
    await expect(menu.getByRole("link", { name: "Queue" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Import" })).toHaveCount(0);
    // The page answers with the app's "not found" screen (streamed, so the status can still be 200).
    await page.goto("/collections/settings");
    await expect(page.getByRole("heading", { name: "Collections settings" })).toHaveCount(0);
    await expect(page.getByLabel("Dealership details")).toHaveCount(0);
    await expect(page.getByText(/not found|isn't available|no longer available|could not be found/i).first()).toBeVisible({ timeout: 30_000 });
    await page.goto(`/collections/accounts/${f.accountId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark verified" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await context.close();
  });

  test("signed-out visitors and unsigned webhooks get nothing", async ({ request }) => {
    expect((await request.get("/api/collections/queue")).status()).toBeGreaterThanOrEqual(401);
    const hook = await request.post("/api/collections/sms/inbound", { headers: { "content-type": "application/x-www-form-urlencoded" }, data: "From=%2B16125550123&Body=STOP" });
    expect(hook.status()).toBe(403);
  });
});
