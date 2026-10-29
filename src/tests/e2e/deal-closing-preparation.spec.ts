import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("manager can review closing preparation without signing or releasing a vehicle", async ({ page }) => {
  test.skip(process.env.CLOSING_REVIEW_E2E !== "true", "Opt-in synthetic local database proof.");
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)) throw new Error("Local development database required.");
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const signedIn = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await signedIn).ok()).toBe(true);
  await page.goto("/website-console?section=paperwork");
  await expect(page.getByRole("heading", { name: "Paperwork & Delivery", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Closed-end lease", exact: true })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const reference = `closing-browser-${Date.now()}`;
  const created = await page.request.post("/api/sales-documents", { data: { dealReference: reference, customerName: reference, vehicleReference: "Synthetic browser proof — no actual sale", pathway: "retail-sale" } });
  expect(created.ok()).toBe(true);
  const jacket = await created.json();
  try {
    await page.goto(`/sales-documents?jacketId=${jacket.id}`);
    await page.getByText("Paperwork & delivery preparation · Preparation not started", { exact: true }).click();
    await page.getByRole("button", { name: "Start preparation review", exact: true }).click();
    await page.getByRole("combobox", { name: "Proposed paperwork pathway", exact: true }).selectOption("closed-end-lease");
    await expect(page.getByText("Not automatically lease-to-own.", { exact: false })).toBeVisible();
    await expect(page.getByRole("group", { name: "Lease classification & lifecycle", exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Proposed paperwork pathway", exact: true }).selectOption("cash");
    await page.getByLabel("Classification facts and review references (15–1000 characters)", { exact: true }).fill("Synthetic cash purchase review. Approved forms and live completion remain blocked.");
    const check = page.getByRole("group", { name: "Deal classification & approved rules", exact: true });
    await check.getByRole("combobox", { name: "Preparation state", exact: true }).selectOption("BLOCKED");
    const rejectedSave = page.waitForResponse(response => response.url().endsWith(`/api/sales-documents/${jacket.id}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save internal preparation review", exact: true }).click();
    expect((await rejectedSave).status()).toBe(400);
    await expect(page.getByLabel("Classification facts and review references (15–1000 characters)", { exact: true })).toHaveValue("Synthetic cash purchase review. Approved forms and live completion remain blocked.");
    await expect(check.getByRole("combobox", { name: "Preparation state", exact: true })).toHaveValue("BLOCKED");
    await check.getByLabel("Evidence reference or follow-up reason (up to 1000 characters)", { exact: true }).fill("Synthetic test follow-up: approved form and deadline register is not connected.");
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/sales-documents/${jacket.id}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Save internal preparation review", exact: true }).click();
    const response = await saved;
    expect(response.ok()).toBe(true);
    const review = await response.json();
    expect(review.closingReadiness).toMatchObject({ releaseAllowed: false, signingAllowed: false, stale: false });
    await page.reload();
    await page.locator("summary").filter({ hasText: "Paperwork & delivery preparation" }).click();
    await expect(page.getByText("Synthetic test follow-up: approved form and deadline register is not connected.", { exact: true })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).include("details").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`closing-review-${width}.png`), fullPage: true });
    }
    const changed = await page.request.patch(`/api/sales-documents/${jacket.id}`, { data: { action: "NOTE", revision: review.revision, note: "Synthetic subsequent change invalidates the review." } });
    expect(changed.ok()).toBe(true);
    await page.reload();
    await page.locator("summary").filter({ hasText: "Paperwork & delivery preparation" }).click();
    await expect(page.getByText("The jacket changed after this review.", { exact: false })).toBeVisible();
  } finally {
    const database = new PrismaClient();
    try {
      await database.$transaction(async transaction => {
        const owned = await transaction.salesDocumentJacket.findFirst({ where: { id: jacket.id, dealReference: reference, customerName: reference } });
        if (!owned) throw new Error("Fixture cleanup refused: jacket does not match.");
        await transaction.documentLibraryAuditEvent.deleteMany({ where: { packetId: jacket.packetId } });
        await transaction.salesDocumentJacket.delete({ where: { id: jacket.id } });
        await transaction.documentLibraryPacket.delete({ where: { id: jacket.packetId } });
      });
    } finally { await database.$disconnect(); }
  }
});
