import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { SALES_DOCUMENT_PATHWAYS } from "../../lib/sales-document-pathways";
const reviewExpect = expect.configure({ timeout: 15000 });

test.skip(process.env.RUN_DEAL_CONTINUITY_BROWSER !== "1", "Requires the isolated shared-deal browser fixture.");
test.beforeEach(async ({ page }) => {
  await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Operating rhythm is outside this isolated shared-deal test." } }));
});
test("shared customer and vehicle remain reusable across all deal paths", async ({ page, context }) => {
  test.setTimeout(180000);
  const fixture = JSON.parse(readFileSync("tmp/deal-continuity/browser-fixture.json", "utf8"));
  await context.addCookies([{ name: "dispatch-board-session", value: fixture.token, url: process.env.PLAYWRIGHT_BASE_URL! }]);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const pathway of Object.keys(SALES_DOCUMENT_PATHWAYS)) {
    await page.goto(`/crm-next/deals/start?${new URLSearchParams({ new: "1", pathway, customerId: fixture.customer.id, vehicleId: fixture.vehicle.id })}`);
    const customer = page.getByRole("region", { name: "Shared customer selector", exact: true });
    await reviewExpect(customer.getByText(fixture.customer.displayName, { exact: true })).toBeVisible();
    await reviewExpect(page.getByRole("region", { name: /Shared (temporary vehicle|vehicle) selector/ }).getByText(fixture.vehicle.vin, { exact: false })).toBeVisible();
    await reviewExpect(customer.getByRole("button", { name: "Add new customer" })).toBeVisible();
    const toolbar = page.getByRole("region", { name: "Saved deal drafts" });
    await toolbar.getByRole("button", { name: "Save draft", exact: true }).click();
    await reviewExpect(toolbar.getByRole("status")).toContainText("Draft saved");
  }
  await page.goto(`/crm-next/deals/start?new=1&pathway=vehicle-loaner&sourceDraftId=${fixture.originalDraft.id}`);
  await reviewExpect(page.getByRole("region", { name: "Shared customer selector", exact: true }).getByText(fixture.customer.displayName, { exact: true })).toBeVisible();
  await reviewExpect(page.getByText("Related original deal", { exact: false })).toBeVisible();
  const temporary = page.getByRole("region", { name: "Shared temporary vehicle selector" });
  await temporary.getByRole("textbox", { name: "Search shared temporary vehicles" }).fill(fixture.vehicle.vin);
  await temporary.getByRole("button", { name: "Find vehicle", exact: true }).click();
  await temporary.getByRole("list").getByRole("button").first().click();
  await reviewExpect(temporary.getByText(fixture.vehicle.vin, { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Save & load assignment" }).click();
  await reviewExpect(page.getByRole("link", { name: "Open original deal / delivery" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await temporary.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: test.info().outputPath("shared-deal-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("manual entry creates a shared customer once and duplicate entry offers the existing record", async ({ page, context }) => {
  test.setTimeout(60000);
  const fixture = JSON.parse(readFileSync("tmp/deal-continuity/browser-fixture.json", "utf8"));
  await context.addCookies([{ name: "dispatch-board-session", value: fixture.token, url: process.env.PLAYWRIGHT_BASE_URL! }]);
  const phone = `+1612${Date.now().toString().slice(-7)}`, name = `Isolated manual entry ${Date.now()}`;
  await page.goto("/crm-next/deals/start?new=1&pathway=vehicle-loaner");
  const selector = page.getByRole("region", { name: "Shared customer selector", exact: true });
  await selector.getByRole("button", { name: "Add new customer" }).click();
  const form = selector.getByRole("group", { name: "Add shared customer" });
  await form.getByLabel("Customer name", { exact: true }).fill(name);
  await form.getByLabel("Phone", { exact: true }).fill(phone);
  const location = form.getByRole("combobox");
  await reviewExpect(location.locator("option").nth(1)).toBeAttached();
  await location.selectOption((await location.locator("option").nth(1).getAttribute("value"))!);
  const created = page.waitForResponse(response => response.url().endsWith("/api/crm/v1/deal-identities") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Save customer & select" }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const customer = await response.json();
  await reviewExpect(selector.getByText(name, { exact: true })).toBeVisible();
  const saved = page.waitForResponse(response => response.url().endsWith("/api/crm/v1/deal-drafts") && response.request().method() === "POST");
  await page.getByRole("region", { name: "Saved deal drafts" }).getByRole("button", { name: "Save draft", exact: true }).click();
  expect(await (await saved).json()).toMatchObject({ customerId: customer.id, customerName: name });
  await page.goto(`/crm-next/deals/start?new=1&pathway=retail-sale&customerId=${customer.id}&vehicleId=${fixture.vehicle.id}`);
  await reviewExpect(selector.getByText(name, { exact: true })).toBeVisible();
  await selector.getByRole("button", { name: "Add new customer" }).click();
  await form.getByLabel("Customer name", { exact: true }).fill(name);
  await form.getByLabel("Phone", { exact: true }).fill(phone);
  await reviewExpect(location.locator("option").nth(1)).toBeAttached();
  await location.selectOption((await location.locator("option").nth(1).getAttribute("value"))!);
  await form.getByRole("button", { name: "Save customer & select" }).click();
  await reviewExpect(form.getByRole("alert")).toContainText("possible customer match");
  await reviewExpect(form.getByLabel("Customer name", { exact: true })).toHaveValue(name);
});
