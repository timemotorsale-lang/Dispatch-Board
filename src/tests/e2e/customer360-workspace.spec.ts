import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212",
  "Requires the isolated localhost CRM preview.");
const ready = expect.configure({ timeout: 25000 });
test.setTimeout(240000);

test("Customer 360 keeps daily work up front and reopens saved customer activity", async ({ page, playwright, baseURL }) => {
  const connection = new URL(process.env.DATABASE_URL!);
  if (connection.hostname !== "127.0.0.1" || connection.port !== "55435" || connection.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
  const db = new PrismaClient();
  const [customerId, dealId, vehicleId, possibleMatchId] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const suffix = customerId.slice(0, 8);
  const customerName = `Workspace Review ${suffix}`;
  const customerPhone = "+16125550142";
  const customerEmail = `workspace-${suffix}@example.test`;
  const vin = "1HGCM82633A" + String(parseInt(suffix, 16) % 1000000).padStart(6, "0");
  const organizationId = "org-time-motor-sales";
  const inventoryVin = "2HGCM82633A" + vin.slice(-6);
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" }, select: { id: true } });
    await db.customer.create({ data: { id: customerId, organizationId, ownerUserId: owner.id, customerNumber: `TOOLS-${suffix}`, displayName: customerName, phoneNumber: customerPhone, email: customerEmail } });
    await db.customer.create({ data: { id: possibleMatchId, organizationId, ownerUserId: owner.id, customerNumber: `MATCH-${suffix}`, displayName: customerName } });
    const vehicle = await db.vehicle.create({ data: { id: vehicleId, organizationId, vehicleNumber: `TOOLS-${suffix}`, vin, year: 2019, make: "Honda", model: "Accord" } });
    await db.enterpriseAggregateVersion.create({ data: { organizationId, domain: "VEHICLE_REGISTRY", subjectType: "VEHICLE", subjectId: vehicleId, version: vehicle.version } });
    const inventoryVehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: `STOCK-${suffix}`, vin: inventoryVin } });
    const location = await db.location.findFirstOrThrow({ where: { organizationId } });
    const future = new Date(Date.now() + 120_000);
    await db.inventoryUnit.create({ data: {
      organizationId, vehicleId: inventoryVehicle.id, inventoryNumber: `STOCK-${suffix}`, ownerUserId: owner.id, locationId: location.id,
      financialAcquiredAt: future, stageStartedAt: future, targetAt: new Date(Date.now() + 86400000), nextAction: "Synthetic open inventory"
    } });
    for (const code of ["VEHICLE_OPERATIONS_MASTER", "VEHICLE_REGISTRY"]) {
      const current = await db.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId, locationId: null, code } });
      if (!current) await db.vehicleOperationsFeatureFlag.create({ data: { organizationId, locationId: null, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
      else if (current.mode !== "GENERAL" || current.rolloutPercent !== 100) await db.vehicleOperationsFeatureFlag.update({ where: { id: current.id }, data: { mode: "GENERAL", rolloutPercent: 100 } });
    }
  } finally { await db.$disconnect(); }

  expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
  const deal = await page.request.post("/api/crm/v1/deal-drafts", { data: {
    id: dealId, revision: 0, pathway: "retail-sale", customerId, customerName,
    snapshot: { "desk:identity": { customerId }, "desk:form": { customerId }, "desk:workflowId": "retail-sale" }
  } });
  expect(deal.ok(), await deal.text()).toBe(true);
  const path = `/crm-next/customers/${customerId}`;
  await page.goto(path);
  await ready(page.getByRole("heading", { name: customerName })).toBeVisible();
  await ready(page.getByRole("heading", { name: "Work this customer" })).toBeVisible();
  const work = page.getByRole("region", { name: "Work this customer" });
  await expect(work.getByText(customerEmail, { exact: true })).toHaveCount(0);
  await expect(work.getByRole("link", { name: "Call", exact: true })).toHaveCount(0);
  await work.getByRole("button", { name: "Show contact details" }).click();
  await ready(work.getByText(customerEmail, { exact: true })).toBeVisible();
  await expect(work.getByRole("link", { name: "Email", exact: true })).toHaveAttribute("href", `mailto:${encodeURIComponent(customerEmail)}`);
  await expect(work.getByRole("link", { name: "Call", exact: true })).toHaveAttribute("href", `tel:${customerPhone}`);
  await expect(work.getByRole("link", { name: "Text options" })).toHaveAttribute("href", `/crm-next/actions/send-text?customerId=${customerId}`);
  await work.getByRole("button", { name: "Hide contact details" }).click();
  await expect(work.getByText(customerEmail, { exact: true })).toHaveCount(0);
  const tools = page.getByRole("region", { name: "More tools" });
  const match = tools.locator(`a[href="/crm-next/customers/${possibleMatchId}"]`);
  await expect(match).toBeHidden();
  await work.getByRole("link", { name: "Review possible matches" }).click();
  await ready(match).toBeVisible();
  await expect(tools.getByRole("link", { name: "Deal paperwork checklists" })).toHaveAttribute("href", `/sales-documents?customerId=${customerId}`);
  await tools.getByText("Credit application & pre-qualification", { exact: true }).click();
  await tools.getByRole("link", { name: "Open finance deal desk" }).click();
  await ready(page.getByRole("link", { name: "Back to Customer 360", exact: true })).toHaveAttribute("href", path);
  await expect(page).toHaveURL(/pathway=finance/);
  await page.getByRole("link", { name: "Back to Customer 360", exact: true }).click();
  await ready(work.getByRole("heading", { name: "Work this customer" })).toBeVisible();
  const workspace = page.getByRole("region", { name: "Customer 360", exact: true });
  const sidebar = page.getByRole("complementary", { name: "Customer Console navigation" });
  const sidebarToggle = sidebar.getByRole("button", { name: "Collapse navigation" });
  await ready(sidebar.getByRole("link", { name: "Needs Attention", exact: true })).toBeVisible();
  const expandedWidth = (await workspace.boundingBox())!.width;
  await sidebarToggle.focus();
  await sidebarToggle.press("Enter");
  const expand = sidebar.getByRole("button", { name: "Expand navigation" });
  await ready(expand).toBeFocused();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.getByRole("link", { name: "Needs Attention", exact: true })).toBeHidden();
  expect((await workspace.boundingBox())!.width).toBeGreaterThan(expandedWidth + 100);
  await expand.click();
  await ready(sidebar.getByRole("link", { name: "Needs Attention", exact: true })).toBeVisible();

  const more = page.getByRole("button", { name: "More customer actions" });
  const quick = page.getByRole("region", { name: "Quick Actions" });
  await expect(quick).toBeHidden();
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await ready(quick.getByRole("link", { name: "Log call", exact: true })).toHaveAttribute("href", `/crm-next/actions/log-call?customerId=${customerId}`);
  await expect(quick.getByRole("link", { name: "Create task", exact: true })).toBeVisible();
  const workBox = await page.getByRole("region", { name: "Work this customer" }).boundingBox();
  const quickBox = await quick.boundingBox();
  expect(quickBox!.x).toBeGreaterThan(workBox!.x + workBox!.width - 1);
  await more.click();
  await expect(quick).toBeHidden();
  await expect(page.getByText("Source status:", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Capture", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.getByLabel("Work category")).toBeFocused();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await ready(page.getByRole("heading", { name: "Customer dashboard" })).toBeVisible();
  await expect(page.getByText("Customer Operating Ledger", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to work" }).click();

  await page.setViewportSize({ width: 390, height: 750 });
  await page.reload();
  const mobileNav = page.getByRole("button", { name: "Open navigation", exact: true });
  await ready(mobileNav).toBeVisible();
  await expect(sidebar).toBeHidden();
  await mobileNav.click();
  await ready(sidebar.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(mobileNav).toBeFocused();
  expect((await work.getByText("Contact", { exact: true }).boundingBox())!.y).toBeLessThan((await work.getByRole("button", { name: "Check in", exact: true }).boundingBox())!.y);
  await more.click();
  await ready(quick.getByRole("link", { name: "Documents & photos" })).toBeVisible();
  expect((await quick.boundingBox())!.y).toBeGreaterThan((await more.boundingBox())!.y);
  await quick.getByRole("link", { name: "Documents & photos" }).click();
  await ready(page.getByRole("heading", { name: "Documents & photos" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Customer tools" });
  await nav.getByRole("link", { name: "Wishlist" }).click();
  await page.getByRole("button", { name: "Add wishlist" }).click({ timeout: 25000 });
  const wishlist = "Synthetic preferences " + suffix;
  await page.getByLabel("Vehicle preferences").fill(wishlist);
  await nav.getByRole("link", { name: "Work", exact: true }).click();
  await nav.getByRole("link", { name: "Wishlist" }).click();
  await expect(page.getByLabel("Vehicle preferences")).toHaveValue(wishlist);
  await page.getByRole("button", { name: "Save wishlist" }).click();
  await ready(page.getByText("Wishlist saved.")).toBeVisible();
  const wishlistActions = `/api/crm-next/customers/${customerId}/actions`;
  const stale = await page.request.post(wishlistActions, { data: { action: "save-wishlist", body: "Stale write", expectedWishlistNoteId: null, idempotencyKey: randomUUID() } });
  expect(stale.status()).toBe(409);
  expect(await stale.json()).toMatchObject({ code: "WISHLIST_CHANGED" });
  await page.reload();
  await ready(page.getByText(wishlist, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit wishlist" })).toBeVisible();
  const width = await page.locator('[aria-label="Customer 360"]').evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);

  await nav.getByRole("link", { name: "Vehicles", exact: true }).click();
  await page.getByText("Link an existing vehicle", { exact: true }).click({ timeout: 25000 });
  await page.getByLabel("VIN", { exact: true }).fill(vin);
  await page.getByRole("button", { name: "Find vehicle" }).click();
  await ready(page.getByText(vin, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Link for service" }).click();
  await ready(page.getByText("Vehicle linked for service.")).toBeVisible();
  await page.reload();
  await ready(page.getByRole("link", { name: "Open vehicle", exact: true })).toHaveAttribute("href", `/vehicles/360/${vehicleId}`);
  const endpoint = `/api/crm-next/customers/${customerId}/vehicle-links`;
  const inventoryBlocked = await page.request.get(endpoint + "?" + new URLSearchParams({ vin: inventoryVin }));
  expect(inventoryBlocked.status()).toBe(409);
  const replay = await page.request.post(endpoint, { data: { vehicleId, version: 1, vin } });
  expect(await replay.json()).toMatchObject({ duplicate: true });

  await nav.getByRole("link", { name: "Deals & deposits" }).click();
  await expect(page.getByRole("heading", { name: "Accounting & deposits" })).toBeVisible();
  await page.getByRole("button", { name: /Open Money for deal/ }).click({ timeout: 25000 });
  await ready(page.getByRole("tab", { name: "Money", exact: true })).toHaveAttribute("aria-selected", "true");
  await ready(page.getByRole("heading", { name: "Recorded financial activity" })).toBeVisible();
  const wrongCustomer = await page.request.get(`/api/crm/v1/deal-drafts?view=operations&draftId=${dealId}&expectedCustomerId=${randomUUID()}`);
  expect(wrongCustomer.status()).toBe(409);
  const sales = await playwright.request.newContext({ baseURL });
  try {
    expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    expect([403, 404]).toContain((await sales.get(`/api/crm-next/customers/${customerId}/contact-details`)).status());
    expect([403, 404]).toContain((await sales.post(`/api/crm-next/customers/${customerId}/actions`, { data: { action: "save-wishlist", body: "Must not save", expectedWishlistNoteId: null, idempotencyKey: randomUUID() } })).status());
    expect([403, 404]).toContain((await sales.get(endpoint + "?" + new URLSearchParams({ vin }))).status());
  } finally { await sales.dispose(); }
  console.log("[customer360-preview]", JSON.stringify({ customerId, dealId, vehicleId, customerName }));
});
