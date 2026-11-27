import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212", "Requires the isolated local preview.");
test.use({ actionTimeout: 15000 });
test("an issued order survives a blocked new bin and receives once into an existing bin", async ({ page, playwright, baseURL }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  let restore: (() => Promise<unknown>) | undefined;
  try {
    const organizationId = "org-time-motor-sales", tag = "PARTS-RECOVERY-" + randomUUID().slice(0, 8);
    const owner = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
    const location = await db.location.findUniqueOrThrow({ where: { organizationId_code: { organizationId, code: "TMS-MSP-01" } } });
    const locationId = location.id, createdByUserId = owner.id;
    const old = await db.vehicleOperationsFeatureFlag.findFirst({ where: { organizationId, locationId, code: "PARTS_OPERATIONS" } });
    if (old) {
      await db.vehicleOperationsFeatureFlag.update({ where: { id: old.id }, data: { mode: "OFF" } });
      restore = () => db.vehicleOperationsFeatureFlag.update({ where: { id: old.id }, data: { mode: old.mode } });
    } else {
      const flag = await db.vehicleOperationsFeatureFlag.create({ data: { organizationId, locationId, code: "PARTS_OPERATIONS", mode: "OFF", rolloutPercent: 0, allowedUserIds: [] } });
      restore = () => db.vehicleOperationsFeatureFlag.delete({ where: { id: flag.id } });
    }
    const customer = await db.customer.create({ data: { organizationId, customerNumber: tag, displayName: "Synthetic parts recovery" } });
    const vehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: tag } });
    const visit = await db.serviceVisit.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer.id, origin: "CUSTOMER_REPAIR",
      intakeSource: "WALK_IN", arrivedAt: new Date(), concernSummary: "Synthetic parts receipt", consentStatus: "NOT_REQUIRED", transportMode: "DROP_OFF", createdByUserId } });
    const ro = await db.repairOrder.create({ data: { organizationId, locationId, vehicleId: vehicle.id, customerId: customer.id, serviceVisitId: visit.id,
      repairOrderNumber: tag, origin: "CUSTOMER_REPAIR", intakeSource: "WALK_IN", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(),
      ownerUserId: owner.id, nextAction: "Synthetic parts recovery" } });
    const bin = await db.partStockLocation.create({ data: { organizationId, locationId, code: tag, name: "Synthetic existing receiving bin", type: "BIN" } });
    const part = await db.part.create({ data: { organizationId, partNumber: tag, description: "Synthetic spindle", standardCostCents: 500 } });
    const demand = await db.repairPartDemand.create({ data: { organizationId, repairOrderId: ro.id, partId: part.id, quantityRequired: 2, requiredAt: new Date(), createdByUserId } });
    const req = await db.partRequisition.create({ data: { organizationId, demandId: demand.id, requiredAt: new Date(), quantity: 2, comparisonSnapshot: [], createdByUserId, reason: "Synthetic receipt fixture" } });
    const vendor = await db.partVendor.create({ data: { organizationId, code: tag, name: "Synthetic vendor", paymentTerms: "Training", defaultWarranty: "Training", defaultReturnTerms: "Training", createdByUserId } });
    const po = await db.partPurchaseOrder.create({ data: { organizationId, locationId, vendorId: vendor.id, requisitionId: req.id, purchaseOrderNumber: tag,
      status: "ISSUED", lines: [{ partId: part.id, quantity: 2, unitCostCents: 500 }], orderedTotalCents: 1000, createdByUserId, issuedAt: new Date(), reason: "Synthetic receipt fixture" } });
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: owner.email, password: "dispatch123!" } })).ok()).toBe(true);
    const path = `/vehicles/service-close-parts?repairOrderId=${ro.id}`;
    await page.goto(path);
    const entry = page.getByRole("region", { name: "Add or receive parts", exact: true });
    await entry.getByRole("combobox", { name: /^Entry type/ }).selectOption("existing");
    await entry.getByRole("combobox", { name: /^Purchase order/ }).selectOption(`${po.id}:${part.id}`);
    await entry.getByLabel("Qty to receive", { exact: true }).fill("1");
    await entry.getByLabel("Received on", { exact: true }).fill("2026-11-26");
    const binSelect = entry.getByRole("combobox", { name: /^Receiving bin/ });
    await binSelect.selectOption("__new__");
    await entry.getByLabel("Actual physical bin or shelf name").fill(tag + " new shelf");
    await entry.getByLabel("Packing reference", { exact: true }).fill(tag);
    const denied = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/api/parts/locations"));
    await entry.getByRole("button", { name: /Record receipt$/ }).click();
    expect((await denied).status()).toBe(400);
    expect(await db.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(0);
    const sales = await playwright.request.newContext({ baseURL });
    try {
      expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
      const unauthorized = await sales.post("/api/service-close-parts", { data: { action: "RECEIVE_PURCHASE_ORDER",
        subjectId: po.id, idempotencyKey: randomUUID(), packingSource: tag, receivedAt: new Date().toISOString(),
        strictRemaining: true, stockLocationId: bin.id, lines: [{ partId: part.id, quantity: 1, unitCostCents: 500, damagedQuantity: 0 }], reason: "Synthetic role check" } });
      expect(unauthorized.status()).toBe(403);
    } finally { await sales.dispose(); }
    const recovery = page.getByRole("region", { name: "Unfinished parts entries" });
    await expect(recovery.getByText(/Creating a new receiving bin is paused/)).toBeVisible();
    await page.reload();
    await recovery.getByLabel("Existing receiving bin").selectOption(bin.id);
    await db.partStockLocation.update({ where: { id: bin.id }, data: { isActive: false } });
    await recovery.getByRole("button", { name: "Save receipt to this bin" }).click();
    await expect(page.getByText(/That receiving bin is no longer available/)).toBeVisible();
    expect(await db.partReceipt.count({ where: { purchaseOrderId: po.id } })).toBe(0);
    await db.partStockLocation.update({ where: { id: bin.id }, data: { isActive: true } });
    await page.reload();
    await recovery.getByLabel("Existing receiving bin").selectOption(bin.id);
    await recovery.getByRole("button", { name: "Save receipt to this bin" }).click();
    await expect.poll(async () => db.partReceipt.count({ where: { purchaseOrderId: po.id, stockLocationId: bin.id } })).toBe(1);
    expect(await db.partPurchaseOrder.count({ where: { requisitionId: req.id } })).toBe(1);
    await page.reload();
    await expect(recovery).toHaveCount(0);
    expect((await db.partPurchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe("PARTIALLY_RECEIVED");
    console.log("[parts-recovery-preview]", path);
  } finally {
    try { await restore?.(); } finally { await db.$disconnect(); }
  }
});
