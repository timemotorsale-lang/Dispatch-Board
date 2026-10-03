import { test, expect } from "@playwright/test";

test("saved-deal categories search and reopen the selected deal from the Deals page", async ({ page }) => {
  const records = ["SOLD", "LOST", "IN_PROGRESS"].map((status, index) => ({ id: `saved-deal-test-${index}`, revision: 1, status, customerName: `Library Buyer ${status}`, pathway: "bhph", vehicleReference: `Vehicle ${index}`, updatedAt: "2026-10-03T12:00:00Z", snapshot: { "desk:workflowId": "bhph", "desk:executionOpen": true, "bhph:terms": { downPayment: "$2500" } } }));
  await page.route("**/api/crm/v1/deal-drafts*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (route.request().method() === "POST") return route.fulfill({ json: { ...route.request().postDataJSON(), updatedAt: new Date().toISOString(), revision: 2 } });
    if (params.has("id")) return route.fulfill({ json: records.find((record) => record.id === params.get("id")) });
    if (params.get("view") !== "workbench") return route.fulfill({ json: records });
    const base = records.filter((record) => record.customerName.toLowerCase().includes((params.get("search") || "").toLowerCase()) && (params.get("pathway") === "ALL" || params.get("pathway") === record.pathway));
    const items = base.filter((record) => params.get("status") === "ALL" || params.get("status") === record.status);
    return route.fulfill({ json: { items, counts: Object.fromEntries(base.map((record) => [record.status, 1])), total: items.length, page: 1, pages: 1 } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals");
  const library = page.getByRole("region", { name: "Saved deals library" });
  await library.getByRole("textbox", { name: "Search saved deals" }).fill("Library Buyer");
  await library.getByRole("combobox", { name: "Deal status filter" }).selectOption("LOST");
  await expect(library.getByText("Library Buyer LOST", { exact: true })).toBeVisible();
  await expect(library.getByText("Library Buyer SOLD", { exact: true })).toHaveCount(0);
  await library.getByRole("combobox", { name: "Deal status filter" }).selectOption("SOLD");
  await library.getByRole("button", { name: "Open deal for Library Buyer SOLD", exact: true }).click();
  await page.waitForURL("**/crm-next/deals/start?draftId=saved-deal-test-0");
  await expect(page.getByLabel("Current saved deal status")).toHaveValue("SOLD");
  await expect(page.getByLabel("Down payment", { exact: true })).toHaveValue("$2500");
  await page.reload();
  await expect(page.getByLabel("Current saved deal status")).toHaveValue("SOLD");
});

test("the compact workbench exposes a rental packet even without a draft", async ({ page }) => {
  await page.route("**/api/crm/v1/deal-drafts*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("view") !== "workbench") return route.fulfill({ json: [] });
    return route.fulfill({ json: { items: [{ id: "rental-jacket-only", draftId: null, jacketId: "rental-jacket-only", customerName: "Packet Only Renter", vehicleReference: "Rental unit", pathway: "daily-rental", status: "IN_PROGRESS", packetState: "CHECKED_OUT", updatedAt: "2026-10-03T12:00:00Z" }], counts: { IN_PROGRESS: 1 }, total: 1, page: 1, pages: 1 } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals");
  const library = page.getByRole("region", { name: "Saved deals library" });
  await expect(library.getByRole("link", { name: "Open packet for Packet Only Renter" })).toHaveAttribute("href", "/sales-documents?jacketId=rental-jacket-only");
  await expect(library.getByRole("button", { name: "Open deal for Packet Only Renter" })).toHaveCount(0);
  await expect(library.getByText("Checked out", { exact: true })).toBeVisible();
  await expect(page.getByText("Deals in progress", { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("compact-rental-workbench-mobile.png") });
});

test("start deal opens the selected revenue path directly", async ({ page }) => {
  await page.route("**/api/crm/v1/deal-drafts*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("view") !== "workbench") return route.fulfill({ json: [] });
    return route.fulfill({ json: { items: [], counts: {}, total: 0, page: 1, pages: 1 } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("morgan.manager@local.test");
  await page.getByLabel("Password", { exact: true }).fill("dispatch123!");
  const login = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await login).ok()).toBe(true);
  await page.goto("/crm-next/deals");
  const library = page.getByRole("region", { name: "Saved deals library" });
  await library.getByRole("combobox", { name: "Saved deal revenue path" }).selectOption("bhph");
  await library.getByRole("link", { name: "Start Deal" }).click();
  await page.waitForURL("**/crm-next/deals/start?new=1&pathway=bhph");
  await expect(page.getByRole("heading", { name: "BHPH", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Start Deal presets" })).toHaveCount(0);
  await expect(page.getByLabel("BHPH paperwork next actions")).toBeVisible();
});
