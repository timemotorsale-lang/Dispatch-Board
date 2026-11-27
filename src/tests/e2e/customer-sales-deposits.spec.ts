import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212",
  "Requires the isolated localhost CRM preview.");
test.setTimeout(180000);
const ready = expect.configure({ timeout: 40000 });

test("managers record, review and refund deposits, and the sale guard follows the exact customer", async ({ page, playwright, baseURL }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  try {
    const organizationId = "org-time-motor-sales";
    const owner = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
    const location = await db.location.findFirstOrThrow({ where: { organizationId } });
    const buyer = await db.customer.create({ data: { id: randomUUID(), organizationId, ownerUserId: owner.id, customerNumber: "DEP-" + randomUUID(), displayName: "Synthetic Deposit Review" } });
    const otherBuyer = await db.customer.create({ data: { id: randomUUID(), organizationId, ownerUserId: owner.id, customerNumber: "DEP-" + randomUUID(), displayName: "Synthetic Alternate Buyer" } });
    async function inventory() {
      const stock = "DP-" + randomUUID().slice(0, 8);
      const vehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: stock, stockNumber: stock, year: 2022, make: "Toyota", model: "Camry" } });
      await db.inventoryUnit.create({ data: { organizationId, vehicleId: vehicle.id, inventoryNumber: stock,
        lifecycleStage: "FRONTLINE_READY", ownerUserId: owner.id, locationId: location.id, financialAcquiredAt: new Date(), stageStartedAt: new Date(), targetAt: new Date(), nextAction: "Synthetic deposit review" } });
      return vehicle;
    }
    const vehicle = await inventory();
    const vehicleForBuyer = await inventory();
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    const path = `/crm-next/customers/${buyer.id}#deals`;
    const endpoint = `/api/crm-next/customers/${buyer.id}/deposits`;
    await page.goto(path);
    await ready(page.getByRole("button", { name: "Record deposit", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Record deposit", exact: true }).click();
    const form = page.getByRole("form", { name: "Record deposit" });
    await form.getByLabel("Amount ($)").fill("500.05");
    await form.getByLabel("Payment method").selectOption("OTHER_CARD");
    await ready(form.getByText(/does not charge the card/)).toBeVisible();
    const cardRef = "TEST-APPROVAL-" + randomUUID().slice(0, 8);
    await form.getByLabel("Transaction reference").fill(cardRef);
    await form.getByLabel("Link a vehicle and place a hold").check();
    await form.getByLabel(/Search ready inventory/).fill(vehicle.stockNumber!);
    await form.getByRole("button", { name: "Find vehicle" }).click();
    await form.getByRole("button", { name: /Select 2022 Toyota Camry/ }).click();
    await form.getByLabel("Mark non-refundable").check();
    await form.getByLabel(/showed these terms/).check();
    await form.getByLabel(/verified that the payment/).check();
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await ready(page.getByText("Payment recorded. Receipt is ready.")).toBeVisible();
    await page.reload();
    const row = page.getByRole("list", { name: "Saved deposits" }).getByRole("listitem").filter({ hasText: "$500.05" });
    await ready(row.getByText("$500.05 · Vehicle held", { exact: true })).toBeVisible();
    const receipt = (await row.getByRole("link", { name: "Review / print receipt" }).getAttribute("href"))!;
    const popupReady = page.waitForEvent("popup");
    await row.getByRole("link", { name: "Review / print receipt" }).click();
    const popup = await popupReady;
    await ready(popup.getByRole("heading", { name: "Deposit receipt" })).toBeVisible();
    await expect(popup.getByRole("img", { name: "Time Motor Sales" })).toBeVisible();
    await expect(popup.getByText(/subject to applicable law/)).toBeVisible();
    await popup.evaluate(() => { window.print = () => { document.body.dataset.testPrinted = "yes"; }; });
    await popup.getByRole("button", { name: "Print receipt" }).click();
    await expect(popup.locator("body")).toHaveAttribute("data-test-printed", "yes");
    await popup.emulateMedia({ media: "print" });
    await expect(popup.getByText(/browser Print command/)).toBeHidden();
    await popup.close();
    const saved = await db.customerSalesDeposit.findFirstOrThrow({ where: { vehicleId: vehicle.id } });
    const response = await page.request.post(endpoint, { data: { id: saved.id, action: "receive", amount: "500.05", method: "OTHER_CARD",
      vehicleId: vehicle.id, nonRefundable: true, reference: cardRef, confirmed: true, termsPresented: true } });
    expect(await response.json()).toMatchObject({ id: saved.id, duplicate: true });
    const createDeal = async (customer: typeof buyer, selectedVehicle: typeof vehicle) => db.dealDeskDraft.create({ data: {
      id: randomUUID(), organizationId: "default-org", ownerUserId: owner.id,
      customerId: customer.id, customerName: customer.displayName, vehicleReference: selectedVehicle.vehicleNumber, pathway: "retail-sale",
      snapshot: { "desk:identity": { customerId: customer.id, vehicleId: selectedVehicle.id } }
    } });
    const otherDeal = await createDeal(otherBuyer, vehicle);
    const deniedSale = await page.request.patch("/api/crm/v1/deal-drafts", { data: { action: "MARK_SOLD", id: otherDeal.id, revision: otherDeal.revision } });
    expect(deniedSale.status(), await deniedSale.text()).toBe(409);
    expect(await deniedSale.json()).toMatchObject({ error: expect.stringContaining("held by a customer deposit") });
    await expect(db.inventoryUnit.updateMany({ where: { vehicleId: vehicle.id }, data: { lifecycleStage: "SOLD" } })).rejects.toThrow(/held by a customer deposit/);
    const sales = await playwright.request.newContext({ baseURL });
    try {
      expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
      expect([403, 404]).toContain((await sales.get(receipt)).status());
      expect([403, 404]).toContain((await sales.post(endpoint, { data: {
        id: saved.id, action: "refund", reference: "WRONG", reason: "Not authorized", confirmed: true
      } })).status());
    } finally { await sales.dispose(); }
    await expect(db.vehicle.update({ where: { id: vehicle.id }, data: { mergedIntoVehicleId: vehicleForBuyer.id, status: "INACTIVE" } })).rejects.toThrow(/deposit hold.*before merging/);
    await expect(db.vehicle.update({ where: { id: vehicleForBuyer.id }, data: { mergedIntoVehicleId: vehicle.id, status: "INACTIVE" } })).rejects.toThrow(/deposit hold.*before merging/);
    const overlapping = await page.request.post(`/api/crm-next/customers/${otherBuyer.id}/deposits`, { data: {
      action: "receive", id: randomUUID(), amount: "350", method: "CASH", vehicleId: vehicle.id, confirmed: true, termsPresented: true
    } });
    expect(overlapping.status(), await overlapping.text()).toBe(409);
    await row.getByRole("button", { name: "Refund…" }).click();
    const refund = page.getByRole("form", { name: "Record full refund" });
    const partial = await page.request.post(endpoint, { data: { id: saved.id, action: "refund", amount: "500", reference: "PARTIAL", reason: "Partial", confirmed: true } });
    expect(partial.status()).toBe(409);
    const original = await page.request.post(endpoint, { data: { id: saved.id, action: "refund", amount: "500.05", reference: cardRef, reason: "Wrong reference", confirmed: true } });
    expect(original.status()).toBe(400);
    await refund.getByLabel("Amount actually refunded ($)").fill("500.05");
    await refund.getByLabel("Refund transaction reference").fill("TEST-REFUND-" + randomUUID().slice(0, 8));
    await refund.getByLabel("Refund reason").fill("Manager verified refund");
    await refund.getByLabel(/verified the full refund/).check();
    await refund.getByRole("button", { name: "Record full refund", exact: true }).click();
    await ready(row.getByText("$500.05 · Refunded", { exact: true })).toBeVisible();
    const refundedReceipt = await page.request.get(receipt);
    expect(await refundedReceipt.text()).toContain("Deposit hold released");
    const allowedSale = await page.request.patch("/api/crm/v1/deal-drafts", { data: { action: "MARK_SOLD", id: otherDeal.id, revision: otherDeal.revision } });
    expect(allowedSale.ok(), await allowedSale.text()).toBe(true);

    const second = await page.request.post(endpoint, { data: { action: "receive", id: randomUUID(), amount: "250", method: "CASH", vehicleId: vehicleForBuyer.id, confirmed: true, termsPresented: true } });
    expect(second.ok(), await second.text()).toBe(true);
    const exactDeal = await createDeal(buyer, vehicleForBuyer);
    const exactSale = await page.request.patch("/api/crm/v1/deal-drafts", { data: { action: "MARK_SOLD", id: exactDeal.id, revision: exactDeal.revision } });
    expect(exactSale.ok(), await exactSale.text()).toBe(true);
    const unit = await db.inventoryUnit.findFirstOrThrow({ where: { vehicleId: vehicleForBuyer.id } });
    const completion = await db.inventoryRetailCompletion.create({ data: {
      organizationId, ownerUserId: owner.id, locationId: location.id, inventoryUnitId: unit.id, workflowVersion: "test", policyVersion: "test",
      availabilitySnapshot: {}, reservationSnapshot: {}, saleAuthorizationSnapshot: {}, deliveryReadinessSnapshot: {}, deliverySnapshot: {},
      unwindSnapshot: {}, reconciliationSnapshot: {}, exceptionSnapshot: {}, targetAt: new Date(), nextAction: "Synthetic readiness"
    } });
    const exactProof = { customerReference: buyer.customerNumber, dealReference: exactDeal.id };
    await expect(db.inventoryRetailCompletion.update({ where: { id: completion.id }, data: {
      stage: "SALE_AUTHORIZATION", saleAuthorizationSnapshot: { ...exactProof, customerReference: otherBuyer.customerNumber }
    } })).rejects.toThrow(/held by a customer deposit/);
    await db.inventoryRetailCompletion.update({ where: { id: completion.id }, data: { stage: "SALE_AUTHORIZATION", saleAuthorizationSnapshot: exactProof } });
    await db.inventoryRetailCompletion.update({ where: { id: completion.id }, data: { stage: "AVAILABLE_FOR_SALE" } });
    await expect(db.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: "SOLD" } })).rejects.toThrow(/held by a customer deposit/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Record deposit", exact: true }).click();
    await form.getByLabel("Amount ($)").fill("100");
    await form.getByLabel(/showed these terms/).check();
    await form.getByLabel(/verified that the payment/).check();
    const width = await form.evaluate(el => ({ scroll: el.scrollWidth, width: el.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.width + 1);
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await ready(page.getByText("$100.00 · Received", { exact: true })).toBeVisible();
    expect(await db.customerSalesDeposit.count({ where: { customerId: buyer.id, vehicleId: null } })).toBe(1);
    expect(await db.enterpriseAuditEvent.count({ where: { correlationId: saved.id } })).toBe(2);
    console.log("[deposit-preview]", path);
  } finally { await db.$disconnect(); }
});
