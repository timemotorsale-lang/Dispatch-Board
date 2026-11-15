import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { prisma } from "@/server/db/client";
import { disconnectDailyWorkflowDatabase, resetDailyWorkflowState } from "./daily-workflow.setup";

// UI cases are added only after the component/helper contract is finalized.
// Run this spec alone on a NEW local schema; never point it at preview F or B.
function assertDisposableSchema() {
  const db = new URL(process.env.DATABASE_URL ?? "invalid:");
  if (!["postgres:", "postgresql:"].includes(db.protocol) || db.hostname !== "127.0.0.1" || db.port !== "55439" || !db.searchParams.get("schema")?.startsWith("dispatch_board_e2e_compact_parts_")) {
    throw new Error("Compact parts tests require a fresh dispatch_board_e2e_compact_parts_* schema on local port 55439.");
  }
}

async function seedPartsOrder() {
  assertDisposableSchema();
  const tag = `compact-parts-${randomUUID().slice(0, 8)}`;
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

// Confirm parent integration readiness before running these focused cases.
test("needed save retains failed input and rapid retry creates exactly one demand", async ({ page, partsOrder }) => {
  const entry = await openEntry(page, partsOrder.ro.id);
  await entry.getByLabel("Part", { exact: true }).fill(`${partsOrder.tag} connector`);
  await entry.getByLabel("Qty", { exact: true }).fill("2");
  let failures = 0;
  await page.route("**/api/parts", async route => {
    if (route.request().method() === "POST" && failures++ === 0) return route.fulfill({ status: 503, json: { error: "Synthetic temporary parts outage" } });
    await route.continue();
  });
  await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue(`${partsOrder.tag} connector`);
  await expect(entry.getByLabel("Qty", { exact: true })).toHaveValue("2");
  expect(await prisma.repairPartDemand.count({ where: { repairOrderId: partsOrder.ro.id } })).toBe(0);
  await entry.getByRole("button", { name: "Retry save", exact: true }).evaluate(button => { if (!(button instanceof HTMLButtonElement)) throw new Error("Expected submit button"); button.click(); button.click(); });
  await expect.poll(() => prisma.repairPartDemand.count({ where: { repairOrderId: partsOrder.ro.id } }), { timeout: 45_000 }).toBe(1);
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
  expect(await prisma.partPurchaseOrder.count({ where: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } })).toBe(0);
});

for (const scenario of ["received", "approval", "lost-receipt-response"] as const) {
  const approvalRequired = scenario === "approval", loseReceiptResponse = scenario === "lost-receipt-response";
  test(`purchased and received entry ${loseReceiptResponse ? "recovers exact committed receipt after response loss" : approvalRequired ? "preserves approval hold without receipt" : "creates one purchase and exact receipt"}`, async ({ page, partsOrder }) => {
    await approvalPolicy(page, approvalRequired);
    const entry = await openEntry(page, partsOrder.ro.id);
    await entry.getByLabel("Part", { exact: true }).fill(`${partsOrder.tag} purchased connector`);
    await entry.getByLabel("Qty", { exact: true }).fill("2");
    await entry.getByRole("checkbox", { name: "Purchased", exact: true }).check();
    await entry.getByLabel("Vendor / from where", { exact: true }).fill("SYNTHETIC local supplier");
    await entry.getByLabel("Purchased on", { exact: true }).fill("2026-11-14");
    await entry.getByLabel("Unit price ($)", { exact: true }).fill("12.50");
    await entry.getByRole("checkbox", { name: "Received", exact: true }).check();
    await entry.getByLabel("Received on", { exact: true }).fill("2026-11-14");
    await entry.getByRole("combobox", { name: /^Receiving bin/ }).selectOption(partsOrder.bin.id);
    await entry.getByLabel("Packing reference", { exact: true }).fill(`${partsOrder.tag}-packing`);
    let receiptResponseLost = false;
    const receiptRequests: unknown[] = [];
    if (loseReceiptResponse) await page.route("**/api/service-close-parts", async route => {
      if (route.request().method() !== "POST" || route.request().postDataJSON().action !== "RECEIVE_PURCHASE_ORDER") return route.continue();
      receiptRequests.push(route.request().postDataJSON());
      if (receiptResponseLost) return route.continue();
      const committed = await route.fetch();
      expect(committed.ok(), await committed.text()).toBe(true);
      expect(await prisma.partReceipt.count({ where: { purchaseOrderId: route.request().postDataJSON().subjectId } })).toBe(1);
      receiptResponseLost = true;
      await route.fulfill({ status: 503, json: { error: "Synthetic connection lost after committed receipt" } });
    });
    await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
    if (loseReceiptResponse) {
      await expect(entry.getByRole("button", { name: "Retry save", exact: true })).toBeVisible({ timeout: 60_000 });
      const committedReceipts = await prisma.partReceipt.findMany({ where: { purchaseOrder: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } }, orderBy: { id: "asc" } });
      expect(committedReceipts).toHaveLength(1);
      await entry.getByRole("button", { name: "Retry save", exact: true }).click();
      await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("", { timeout: 45_000 });
      expect(receiptResponseLost).toBe(true);
      expect(receiptRequests).toHaveLength(2);
      expect(receiptRequests[1]).toEqual(receiptRequests[0]);
      expect(await prisma.partReceipt.findMany({ where: { purchaseOrder: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } }, orderBy: { id: "asc" } })).toEqual(committedReceipts);
    }
    await expect.poll(() => prisma.partPurchaseOrder.count({ where: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } }), { timeout: 60_000 }).toBe(1);
    const po = await prisma.partPurchaseOrder.findFirstOrThrow({ where: { requisition: { demand: { repairOrderId: partsOrder.ro.id } } } });
    if (approvalRequired) {
      await expect(entry.getByRole("status")).toContainText(/approval.*required|needs approval/i);
      expect(po.status).toBe("DRAFT");
      expect(await prisma.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(0);
      await expect(entry.getByLabel("Part", { exact: true })).toHaveValue(`${partsOrder.tag} purchased connector`);
      await expect(entry.getByRole("button", { name: "Save parts entry", exact: true })).toBeDisabled();
    } else {
      await expect.poll(() => prisma.partReceipt.count({ where: { purchaseOrderId: po.id } }), { timeout: 45_000 }).toBe(1);
      const receipt = await prisma.partReceipt.findFirstOrThrow({ where: { purchaseOrderId: po.id } });
      expect(receipt.stockLocationId).toBe(partsOrder.bin.id);
      expect(receipt.lines).toEqual(expect.arrayContaining([expect.objectContaining({ quantity: 2, unitCostCents: 1250 })]));
      await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => entry.evaluate(el => el.getBoundingClientRect().right <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`compact-parts-${approvalRequired ? "approval" : "received"}-390.png`), fullPage: true });
  });
}


test("unauthorized Sales cannot create parts or change purchase approval", async ({ page, partsOrder }) => {
  const before = {
    parts: await prisma.part.count({ where: { organizationId: partsOrder.organization.id } }),
    demands: await prisma.repairPartDemand.count({ where: { repairOrderId: partsOrder.ro.id } }),
    purchases: await prisma.partPurchaseOrder.count({ where: { organizationId: partsOrder.organization.id } }),
    receipts: await prisma.partReceipt.count({ where: { organizationId: partsOrder.organization.id } }),
  };
  const login = await page.request.post("/api/auth/login", { data: { email: partsOrder.sales.email, password: "dispatch123!" } });
  expect(login.ok()).toBe(true);
  const denied = await page.request.post("/api/parts", { data: { description: `${partsOrder.tag} denied`, partNumber: partsOrder.tag, standardCostCents: 1250, unitOfMeasure: "EACH", reason: "Synthetic unauthorized parts creation", idempotencyKey: randomUUID() } });
  expect(denied.status()).toBe(403);
  const policy = await page.request.post("/api/service-close-parts", { data: { action: "SET_PURCHASE_APPROVAL_POLICY", required: false, idempotencyKey: randomUUID() } });
  expect(policy.status()).toBe(403);
  expect({
    parts: await prisma.part.count({ where: { organizationId: partsOrder.organization.id } }),
    demands: await prisma.repairPartDemand.count({ where: { repairOrderId: partsOrder.ro.id } }),
    purchases: await prisma.partPurchaseOrder.count({ where: { organizationId: partsOrder.organization.id } }),
    receipts: await prisma.partReceipt.count({ where: { organizationId: partsOrder.organization.id } }),
  }).toEqual(before);
});


test("needed part becomes purchase then exact partial receipts without re-entering identity", async ({ page, partsOrder }) => {
  await approvalPolicy(page, false);
  const entry = await openEntry(page, partsOrder.ro.id);
  await entry.getByLabel("Part", { exact: true }).fill(`${partsOrder.tag} continuity connector`);
  await entry.getByLabel("Qty", { exact: true }).fill("2");
  await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
  const demand = await prisma.repairPartDemand.findFirstOrThrow({ where: { repairOrderId: partsOrder.ro.id } });
  await entry.getByRole("combobox", { name: /^Entry type/ }).selectOption("needed");
  await entry.getByRole("combobox", { name: /^Needed part/ }).selectOption(demand.id);
  await expect(entry.getByLabel("Qty", { exact: true })).toHaveValue("2");
  await entry.getByLabel("Vendor / from where", { exact: true }).fill("SYNTHETIC continuity vendor");
  await entry.getByLabel("Purchased on", { exact: true }).fill("2026-11-14");
  await entry.getByLabel("Unit price ($)", { exact: true }).fill("12.50");
  await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
  expect(await prisma.repairPartDemand.count({ where: { repairOrderId: partsOrder.ro.id } })).toBe(1);
  const po = await prisma.partPurchaseOrder.findFirstOrThrow({ where: { requisition: { demandId: demand.id } } });
  expect(po.lines).toEqual(expect.arrayContaining([expect.objectContaining({ partId: demand.partId, quantity: 2 })]));
  for (const remaining of [2, 1]) {
    await entry.getByRole("combobox", { name: /^Entry type/ }).selectOption("existing");
    await entry.getByRole("combobox", { name: /^Purchase order/ }).selectOption(`${po.id}:${demand.partId}`);
    const quantity = entry.getByLabel("Qty to receive", { exact: true });
    await expect(quantity).toHaveValue(String(remaining));
    await expect(quantity).toHaveAttribute("max", String(remaining));
    await quantity.fill(String(remaining + 1));
    expect(await quantity.evaluate(el => el instanceof HTMLInputElement && !el.checkValidity())).toBe(true);
    await quantity.fill("1");
    await entry.getByLabel("Received on", { exact: true }).fill("2026-11-14");
    await entry.getByRole("combobox", { name: /^Receiving bin/ }).selectOption(partsOrder.bin.id);
    await entry.getByLabel("Packing reference", { exact: true }).fill(`${partsOrder.tag}-partial-${remaining}`);
    await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
    await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
  }
  expect(await prisma.partPurchaseOrder.count({ where: { requisition: { demandId: demand.id } } })).toBe(1);
  const receipts = await prisma.partReceipt.findMany({ where: { purchaseOrderId: po.id } });
  expect(receipts).toHaveLength(2);
  for (const receipt of receipts) expect(receipt.lines).toEqual(expect.arrayContaining([expect.objectContaining({ partId: demand.partId, quantity: 1 })]));
});


test("existing multi-line PO receives exact selected line and preserves other remaining quantities", async ({ page, partsOrder }) => {
  // Existing-order fixture only: procurement is covered by the browser cases above.
  const organizationId = partsOrder.organization.id, createdByUserId = partsOrder.partsUser.id;
  const first = await prisma.part.create({ data: { organizationId, partNumber: `${partsOrder.tag}-A`, description: "SYNTHETIC multiline connector A", standardCostCents: 500 } });
  const second = await prisma.part.create({ data: { organizationId, partNumber: `${partsOrder.tag}-B`, description: "SYNTHETIC multiline connector B", standardCostCents: 700 } });
  const demand = await prisma.repairPartDemand.create({ data: { organizationId, repairOrderId: partsOrder.ro.id, partId: first.id, quantityRequired: 2, requiredAt: new Date(), createdByUserId } });
  const requisition = await prisma.partRequisition.create({ data: { organizationId, demandId: demand.id, requiredAt: new Date(), quantity: 2, comparisonSnapshot: [], createdByUserId, reason: "Synthetic existing multi-line order fixture" } });
  const vendor = await prisma.partVendor.create({ data: { organizationId, code: partsOrder.tag, name: "SYNTHETIC multiline vendor", paymentTerms: "Training only", defaultWarranty: "Training only", defaultReturnTerms: "Training only", createdByUserId } });
  const po = await prisma.partPurchaseOrder.create({ data: { organizationId, locationId: partsOrder.location.id, vendorId: vendor.id, requisitionId: requisition.id, purchaseOrderNumber: partsOrder.tag, status: "ISSUED", lines: [{ partId: first.id, quantity: 2, unitCostCents: 500 }, { partId: second.id, quantity: 3, unitCostCents: 700 }], orderedTotalCents: 3100, createdByUserId, reason: "Synthetic existing multi-line order fixture", issuedAt: new Date() } });
  const entry = await openEntry(page, partsOrder.ro.id);
  await entry.getByRole("combobox", { name: /^Entry type/ }).selectOption("existing");
  const orders = entry.getByRole("combobox", { name: /^Purchase order/ });
  await expect(orders.locator(`option[value="${po.id}:${first.id}"]`)).toHaveCount(1);
  await expect(orders.locator(`option[value="${po.id}:${second.id}"]`)).toHaveCount(1);
  await orders.selectOption(`${po.id}:${second.id}`);
  await expect(entry.getByLabel("Qty to receive", { exact: true })).toHaveValue("3");
  await entry.getByLabel("Qty to receive", { exact: true }).fill("1");
  await entry.getByLabel("Received on", { exact: true }).fill("2026-11-14");
  await entry.getByRole("combobox", { name: /^Receiving bin/ }).selectOption(partsOrder.bin.id);
  await entry.getByLabel("Packing reference", { exact: true }).fill(`${partsOrder.tag}-B-only`);
  await entry.getByRole("button", { name: "Save parts entry", exact: true }).click();
  await expect(entry.getByLabel("Part", { exact: true })).toHaveValue("");
  const receipts = await prisma.partReceipt.findMany({ where: { purchaseOrderId: po.id } });
  expect(receipts).toHaveLength(1);
  expect(receipts[0].lines).toEqual([expect.objectContaining({ partId: second.id, quantity: 1, unitCostCents: 700 })]);
  await entry.getByRole("combobox", { name: /^Entry type/ }).selectOption("existing");
  await orders.selectOption(`${po.id}:${first.id}`);
  await expect(entry.getByLabel("Qty to receive", { exact: true })).toHaveValue("2");
  await orders.selectOption(`${po.id}:${second.id}`);
  await expect(entry.getByLabel("Qty to receive", { exact: true })).toHaveValue("2");
  await expect(entry.getByLabel("Qty to receive", { exact: true })).toHaveAttribute("max", "2");
});
