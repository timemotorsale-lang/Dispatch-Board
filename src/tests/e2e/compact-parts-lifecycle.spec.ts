import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

// UI cases are added only after the component/helper contract is finalized.
// Run this spec alone on a NEW local schema; never point it at preview F or B.
function assertDisposableSchema() {
  const db = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["postgres:", "postgresql:"].includes(db.protocol) || db.hostname !== "127.0.0.1" || db.port !== "55439" || !db.searchParams.get("schema")?.startsWith("dispatch_board_e2e_parts_lifecycle_")) {
    throw new Error("Compact parts tests require a fresh dispatch_board_e2e_parts_lifecycle_* schema on local port 55439.");
  }
}

async function seedPartsOrder() {
  assertDisposableSchema();
  const tag = `parts-lifecycle-${randomUUID().slice(0, 8)}`;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  const location = await prisma.location.findUniqueOrThrow({ where: { organizationId_code: { organizationId: organization.id, code: "TMS-MSP-01" } } });
  const manager = await prisma.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
  const partsUser = await prisma.user.findUniqueOrThrow({ where: { email: "pat.parts@local.test" } });
  const sales = await prisma.user.findUniqueOrThrow({ where: { email: "jordan.sales@local.test" } });
  const customer = await prisma.customer.create({ data: { organizationId: organization.id, customerNumber: tag, displayName: "SYNTHETIC compact parts customer - no real purchase" } });
  const vehicle = await prisma.vehicle.create({ data: { organizationId: organization.id, vehicleNumber: tag, year: 2016, make: "Toyota", model: "Camry", vinState: "NON_VIN_EXCEPTION", nonVinReason: "Disposable compact parts test", vinValidationSource: "SYNTHETIC_E2E" } });
  const visit = await prisma.serviceVisit.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", arrivedAt: new Date(), concernSummary: "Synthetic connector replacement; no real vehicle or vendor order.", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId: manager.id } });
  const ro = await prisma.repairOrder.create({ data: { organizationId: organization.id, locationId: location.id, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: visit.id, repairOrderNumber: `${tag}-OPEN`, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(Date.now() + 86400000), ownerUserId: manager.id, nextAction: "SYNTHETIC compact parts entry regression" } });
  const bin = await prisma.partStockLocation.create({ data: { organizationId: organization.id, locationId: location.id, code: tag, name: "SYNTHETIC receiving bin", type: "BIN" } });
  // No demand, purchase, approval, receipt or stock movement is seeded.
  return { tag, organization, location, manager, partsUser, sales, customer, vehicle, ro, bin };
}

const test = base.extend<{ partsOrder: Awaited<ReturnType<typeof seedPartsOrder>> }>({
  partsOrder: async ({ page }, provideFixture) => {
    const fixture = await seedPartsOrder();
    const login = await page.request.post("/api/auth/login", { data: { email: fixture.partsUser.email, password: "dispatch123!" } });
    expect(login.ok(), await login.text()).toBe(true);
    await page.addLocatorHandler(page.getByRole("dialog", { name: "Operating rhythm reminder", exact: true }), async dialog => {
      await dialog.getByLabel("Reason Start The Day cannot happen yet", { exact: true }).fill("Isolated synthetic parts test; no actual operational day.");
      await dialog.getByRole("button", { name: "Save reason", exact: true }).click();
    });
    await page.addLocatorHandler(page.getByRole("button", { name: "Dismiss reminder", exact: true }), async button => { await button.click(); });
    await provideFixture(fixture);
  },
});

test.beforeAll(async () => {
  assertDisposableSchema();
  await resetDailyWorkflowState();
  const organization = await prisma.organization.findUniqueOrThrow({ where: { code: "TIME_MOTOR_SALES" } });
  for (const code of ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS", "PARTS_OPERATIONS"]) {
    await prisma.vehicleOperationsFeatureFlag.deleteMany({ where: { organizationId: organization.id, code } });
    await prisma.vehicleOperationsFeatureFlag.create({ data: { organizationId: organization.id, code, mode: "GENERAL", rolloutPercent: 100, allowedUserIds: [] } });
  }
});
test.afterAll(disconnectDailyWorkflowDatabase);
test.setTimeout(120_000);
test.use({ actionTimeout: 15_000, screenshot: "only-on-failure" });

export { test, expect };


async function approvalPolicy(page: Page, required: boolean) {
  const managerLogin = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
  expect(managerLogin.ok()).toBe(true);
  const response = await page.request.post("/api/service-close-parts", { data: { action: "SET_PURCHASE_APPROVAL_POLICY", required, idempotencyKey: randomUUID() } });
  expect(response.ok(), await response.text()).toBe(true);
  const partsLogin = await page.request.post("/api/auth/login", { data: { email: "pat.parts@local.test", password: "dispatch123!" } });
  expect(partsLogin.ok()).toBe(true);
}
async function openEntry(page: Page, repairOrderId: string) {
  await page.goto(`/vehicles/service-close-parts?repairOrderId=${repairOrderId}`);
  const entry = page.getByRole("region", { name: "Add or receive parts", exact: true });
  await expect(entry).toBeVisible({ timeout: 60_000 });
  return entry;
}

// Integration contract: outcomes are explicit, never inferred from receipt.
// Do not run until the lead confirms helper + parent integration readiness.
async function purchaseForm(page: Page, repairOrderId: string, description: string) {
  const entry = await openEntry(page, repairOrderId);
  await entry.getByLabel("Part", { exact: true }).fill(description);
  await entry.getByLabel("Qty", { exact: true }).fill("2");
  await entry.getByRole("checkbox", { name: "Purchased", exact: true }).check();
  await entry.getByLabel("Vendor / from where", { exact: true }).fill("SYNTHETIC lifecycle vendor");
  await entry.getByLabel("Purchased on", { exact: true }).fill("2026-11-14");
  await entry.getByLabel("Unit price ($)", { exact: true }).fill("12.50");
  return entry;
}

test("Not received creates a purchase without a receipt or outcome", async ({ page, partsOrder }) => {
  await approvalPolicy(page, false);
  let outcomeRequests = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/service-close-parts") && request.postDataJSON().action === "RECORD_RECEIVED_PART_OUTCOME") outcomeRequests++; });
  const entry = await purchaseForm(page, partsOrder.ro.id, `${partsOrder.tag} not received`);
  await entry.getByRole("radio", { name: "Received", exact: true }).check();
  await entry.getByRole("radio", { name: "Not received", exact: true }).check();
  await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("", { timeout: 45_000 });
  const orders = await prisma.partPurchaseOrder.findMany({ where: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } });
  expect(orders).toHaveLength(1);
  expect(await prisma.partReceipt.count({ where: { purchaseOrderId: orders[0].id } })).toBe(0);
  expect(outcomeRequests).toBe(0);
});

for (const lostStep of ["part", "bin"] as const) {
  test(`committed ${lostStep} creation replays exact ID and generated receipt reference`, async ({ page, partsOrder }) => {
    await approvalPolicy(page, false);
    const description = `${partsOrder.tag} replay ${lostStep}`;
    const physicalName = `${partsOrder.tag} actual shelf C2`;
    const entry = await purchaseForm(page, partsOrder.ro.id, description);
    await entry.getByRole("radio", { name: "Received", exact: true }).check();
    await entry.getByLabel("Received on", { exact: true }).fill("2026-11-14");
    await entry.getByRole("combobox", { name: /^Receiving bin/ }).selectOption("__new__");
    await entry.getByLabel("Actual physical bin or shelf name", { exact: true }).fill(physicalName);
    await entry.getByRole("button", { name: "Generate internal reference", exact: true }).click();
    const reference = await entry.getByLabel("Packing reference", { exact: true }).inputValue();
    expect(reference).toMatch(/^RC-[0-9]{6}-[0-9]{6}$/);
    await entry.getByRole("radio", { name: "Not yet used", exact: true }).check();
    let lost = false, committedId = "", outcomes = 0;
    const commands: unknown[] = [];
    page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/service-close-parts") && request.postDataJSON().action === "RECORD_RECEIVED_PART_OUTCOME") outcomes++; });
    await page.route(lostStep === "part" ? "**/api/parts" : "**/api/parts/locations", async route => {
      if (route.request().method() !== "POST") return route.continue();
      commands.push(route.request().postDataJSON());
      if (lost) return route.continue();
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      committedId = (await response.json()).result.id;
      expect(committedId).toBeTruthy();
      if (lostStep === "part") expect((await prisma.part.findUniqueOrThrow({ where: { id: committedId } })).description).toBe(description);
      else expect((await prisma.partStockLocation.findUniqueOrThrow({ where: { id: committedId } })).name).toBe(physicalName);
      lost = true;
      await route.fulfill({ status: 503, json: { error: `Synthetic lost ${lostStep} response AFTER commit` } });
    });
    await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
    await expect(entry.getByRole("button", { name: "Retry save", exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(entry.getByLabel("Part", { exact: true })).toHaveValue(description);
    await entry.getByRole("button", { name: "Retry save", exact: true }).click();
    await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("", { timeout: 60_000 });
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    const parts = await prisma.part.findMany({ where: { organizationId: partsOrder.organization.id, description } });
    const bins = await prisma.partStockLocation.findMany({ where: { organizationId: partsOrder.organization.id, name: physicalName } });
    expect(parts).toHaveLength(1); expect(bins).toHaveLength(1);
    expect(lostStep === "part" ? parts[0].id : bins[0].id).toBe(committedId);
    expect(parts[0].partNumber).toBeTruthy(); expect(bins[0].code).toBeTruthy();
    const receipts = await prisma.partReceipt.findMany({ where: { purchaseOrder: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } } });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ stockLocationId: bins[0].id, packingSource: reference });
    expect(outcomes).toBe(0);
  });
}
