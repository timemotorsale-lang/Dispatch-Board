import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { isValidVin } from "../../lib/vin";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212",
  "Requires the isolated localhost CRM preview.");
test.setTimeout(180000);
const ready = expect.configure({ timeout: 40000 });
function syntheticVin() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return [..."0123456789X"].map(digit => "4T1G11AK" + digit + suffix).find(isValidVin)!;
}

test("showroom VIN reservations survive inventory intake and sourcing orders leave inventory open", async ({ page }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  try {
    const organizationId = "org-time-motor-sales";
    const manager = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
    const location = await db.location.findFirstOrThrow({ where: { organizationId } });
    const makeCustomer = (displayName: string) => db.customer.create({ data: {
      id: randomUUID(), customerNumber: "TEST-" + randomUUID(), ownerUserId: manager.id, organizationId, displayName
    } });
    const customer = await makeCustomer("Synthetic Sourcing Customer");
    const alternate = await makeCustomer("Synthetic Alternate Reservation Customer");
    const vin = syntheticVin();
    const path = `/crm-next/customers/${customer.id}#deals`;
    const url = `/api/crm-next/customers/${customer.id}/deposits`;
    const alternateUrl = `/api/crm-next/customers/${alternate.id}/deposits`;
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    await page.goto(path);
    const form = page.getByRole("form", { name: "Record deposit" });
    async function sign(kind: "ORDER" | "RESERVATION") {
      await ready(page.getByRole("button", { name: "Record deposit", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Record deposit", exact: true }).click();
      await form.getByLabel("Deposit type").selectOption(kind);
      if (kind === "RESERVATION") await form.getByLabel("Showroom vehicle not in inventory").check();
      await form.getByLabel("Amount ($)").fill(kind === "ORDER" ? "3000" : "500");
      await form.getByLabel("Vehicle year").fill("2022");
      await form.getByLabel("Make", { exact: true }).fill("Toyota");
      await form.getByLabel("Model", { exact: true }).fill("Camry");
      await form.getByLabel(kind === "ORDER" ? "Exact VIN (if known)" : "VIN", { exact: true }).fill(vin);
      const price = form.getByLabel(kind === "ORDER" ? "Maximum total price ($)" : "Agreed total price ($)");
      const deadline = form.getByLabel(kind === "ORDER" ? "Source by" : "Purchase by");
      const submit = form.getByRole("button", { name: "Record deposit and issue receipt" });
      await expect(form.getByLabel("Signed agreement reference")).toHaveCount(0);
      if (kind === "ORDER") {
        await price.fill("2500");
        await submit.click();
        await expect(form.getByRole("alert")).toHaveText("Enter a valid Source by date.");
        await expect(deadline).toBeFocused();
        await deadline.fill("2026-12-01");
        await submit.click();
        await expect(form.getByRole("alert")).toHaveText("The maximum total price cannot be less than the deposit amount.");
        await expect(price).toBeFocused();
        expect(await db.customerSalesDeposit.count({ where: { customerId: customer.id } })).toBe(0);
      }
      await price.fill(kind === "ORDER" ? "23000" : "20000");
      await deadline.fill(kind === "ORDER" ? "2026-12-01" : "2027-01-15");
      await form.getByLabel(/verified the customer signed/).check();
      await form.getByLabel(/verified that the payment/).check();
      await submit.click();
      await ready(page.getByRole("heading", { name: "Deposit recorded" })).toBeVisible();
      const saved = await db.customerSalesDeposit.findFirstOrThrow({ where: { customerId: customer.id, kind } });
      const receipt = await page.request.get(`${url}?receipt=${saved.id}`);
      expect(receipt.ok()).toBe(true);
      await page.getByRole("button", { name: "Close receipt options" }).click();
      return { saved, document: await receipt.text() };
    }
    const order = await sign("ORDER");
    expect(order.document).toContain("This order does not reserve current inventory.");
    expect(order.document).toContain("$23,000.00");
    expect(order.document).toContain("DEP-" + order.saved.id.toUpperCase());
    expect(order.document).not.toContain("Signed agreement reference:");
    expect(order.saved.vehicleId).toBeNull();
    expect(order.saved.vin).toBe(vin);
    await db.$queryRaw`SELECT 1 FROM (SELECT assert_customer_deposit_vin_hold(${organizationId}, ${vin}, ${alternate.id})) p`;
    const reservation = await sign("RESERVATION");
    expect(reservation.document).toContain("The dealership reserves the exact VIN");
    expect(reservation.saved.vehicleId).toBeNull();
    expect(await db.vehicle.count({ where: { organizationId, vin } })).toBe(0);
    expect(await db.task.count({ where: { id: { in: [`deposit-follow-up-${order.saved.id}`, `deposit-follow-up-${reservation.saved.id}`] } } })).toBe(2);
    const conflicting = await page.request.post(alternateUrl, { data: { kind: "RESERVATION", action: "receive", id: randomUUID(), amount: "500", method: "CASH",
      agreementYear: "2022", agreementMake: "Toyota", agreementModel: "Camry", agreementVin: vin,
      agreementPrice: "20000", agreementDeadline: "2027-01-15", termsPresented: true, confirmed: true } });
    expect(conflicting.status(), await conflicting.text()).toBe(409);
    await expect(db.$queryRaw`SELECT 1 FROM (SELECT assert_customer_deposit_vin_hold(${organizationId}, ${vin}, ${alternate.id})) p`)
      .rejects.toThrow(/held by a customer deposit/);
    await expect(db.dealDeskDraft.create({ data: { id: randomUUID(), organizationId: "default-org", ownerUserId: manager.id,
      customerId: alternate.id, customerName: alternate.displayName, vehicleReference: vin, pathway: "retail-sale", status: "SOLD", snapshot: {} }
    })).rejects.toThrow(/held by a customer deposit|Link one canonical vehicle/);
    await page.reload();
    await ready(page.getByText("VIN reserved. Inventory intake is still needed.")).toBeVisible();
    const vehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: vin, vin } });
    const unit = await db.inventoryUnit.create({ data: { organizationId, vehicleId: vehicle.id, inventoryNumber: vin,
      lifecycleStage: "FRONTLINE_READY", ownerUserId: manager.id, locationId: location.id, financialAcquiredAt: new Date(),
      stageStartedAt: new Date(), targetAt: new Date(), nextAction: "Synthetic showroom intake" } });
    await expect(db.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: "SOLD" } })).rejects.toThrow(/held by a customer deposit/);
    await page.reload();
    await ready(page.getByText("$500.00 · VIN reservation recorded", { exact: true })).toBeVisible();
    await expect(page.getByText("VIN reserved. Inventory intake is still needed.")).toHaveCount(0);
    const refund = await page.request.post(url, { data: { action: "refund", id: reservation.saved.id, amount: "500", confirmed: true,
      reference: "SHOWROOM-" + randomUUID(), reason: "Synthetic full refund" } });
    expect(refund.ok(), await refund.text()).toBe(true);
    await expect(db.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: "SOLD" } })).resolves.toMatchObject({ lifecycleStage: "SOLD" });
  } finally { await db.$disconnect(); }
});

test("managers record, review and refund deposits, and the sale guard follows the exact customer", async ({ page, playwright, baseURL }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  try {
    const organizationId = "org-time-motor-sales";
    const owner = await db.user.findUniqueOrThrow({ where: { email: "morgan.manager@local.test" } });
    const location = await db.location.findFirstOrThrow({ where: { organizationId } });
    const buyer = await db.customer.create({ data: { id: randomUUID(), organizationId, ownerUserId: owner.id, customerNumber: "DEP-" + randomUUID(), displayName: "Synthetic Deposit Review", phoneNumber: "+16125550142", email: "deposit-review@example.test", address: "123 Example Avenue" } });
    const otherBuyer = await db.customer.create({ data: { id: randomUUID(), organizationId, ownerUserId: owner.id, customerNumber: "DEP-" + randomUUID(), displayName: "Synthetic Alternate Buyer" } });
    async function inventory() {
      const stock = "DP-" + randomUUID().slice(0, 8);
      const vin = syntheticVin();
      const vehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: stock, stockNumber: stock, vin, year: 2022, make: "Toyota", model: "Camry", color: "Maroon" } });
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
    await page.addInitScript(() => { window.print = () => {
      document.body.dataset.printActivation = String(navigator.userActivation.isActive);
      document.body.dataset.printRequests = String(Number(document.body.dataset.printRequests ?? "0") + 1);
    }; });
    await page.goto(path);
    await ready(page.getByRole("button", { name: "Record deposit", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Record deposit", exact: true }).click();
    const form = page.getByRole("form", { name: "Record deposit" });
    await form.getByLabel("Amount ($)").fill("500.05");
    await form.getByLabel("Payment method").selectOption("OTHER_CARD");
    await ready(form.getByText(/does not charge the card/)).toBeVisible();
    const cardRef = "TEST-APPROVAL-" + randomUUID().slice(0, 8);
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await expect(form.getByRole("alert")).toHaveText("Enter a valid transaction reference, not a card number.");
    expect(await db.customerSalesDeposit.count({ where: { customerId: buyer.id } })).toBe(0);
    await form.getByLabel("Transaction reference").fill(cardRef);
    await form.getByLabel("Deposit type").selectOption("RESERVATION");
    await expect(form.getByRole("button", { name: "Print draft agreement" })).toHaveCount(0);
    await form.getByLabel(/verified the customer signed/).check();
    await form.getByLabel(/verified that the payment/).check();
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Select a vehicle from the search results" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveAttribute("data-print-requests", "1");
    expect(await db.customerSalesDeposit.count({ where: { customerId: buyer.id } })).toBe(0);
    await form.getByLabel(/Search ready inventory/).fill("2022 Toyota Camry Maroon");
    await form.getByRole("button", { name: "Find vehicle" }).click();
    await form.getByRole("button", { name: "Select 2022 Toyota Camry / " + vehicle.stockNumber, exact: true }).click();
    const agreement = { agreementPrice: "20000", agreementDeadline: "2027-01-15" };
    await form.getByLabel("Agreed total price ($)").fill(agreement.agreementPrice);
    await form.getByLabel("Purchase by").fill(agreement.agreementDeadline);
    await form.getByLabel(/Allow manager review/).check();
    await form.getByLabel(/verified the customer signed/).check();
    await form.getByLabel(/verified that the payment/).check();
    const printRequest = /\/deposits\?printPreview=/;
    await page.route(printRequest, route => route.fulfill({ status: 503, json: {} }));
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await ready(page.getByRole("heading", { name: "Deposit recorded" })).toBeVisible();
    await expect(page.locator("body")).not.toHaveAttribute("data-print-requests", "1");
    const saved = await db.customerSalesDeposit.findFirstOrThrow({ where: { vehicleId: vehicle.id } });
    const receipt = `${endpoint}?receipt=${saved.id}`;
    const receiptOptions = page.getByRole("region", { name: /Deposit recorded|Deposit agreement and receipt/ });
    await ready(receiptOptions.getByRole("alert")).toContainText("Could not prepare printing");
    await expect(receiptOptions.getByRole("button", { name: "Print receipt", exact: true })).toBeDisabled();
    await expect(receiptOptions.getByRole("link", { name: "Download receipt", exact: true })).toBeVisible();
    await page.unroute(printRequest);
    await receiptOptions.getByRole("button", { name: "Retry", exact: true }).click();
    await receiptOptions.getByRole("button", { name: "Print receipt", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-print-requests", "1");
    await expect(page.locator("body")).toHaveAttribute("data-print-activation", "true");
    await expect(page).toHaveURL(/#deals$/);
    await page.emulateMedia({ media: "print" });
    const printable = page.getByRole("article", { name: "Printable receipt" });
    await expect(printable.getByRole("heading", { name: "Deposit agreement and receipt", exact: true })).toBeVisible();
    await expect(printable.getByRole("img", { name: "Time Motor Sales" })).toBeVisible();
    const letterhead = printable.locator(".receipt-letterhead");
    await expect(letterhead).toHaveCSS("border-bottom-width", "3px");
    const dealerHeader = letterhead.locator(".receipt-dealer");
    const customerHeader = letterhead.locator(".receipt-customer");
    await expect(dealerHeader.getByText("Time Motor Sales, Inc.", { exact: true })).toBeVisible();
    await expect(customerHeader.getByText(buyer.displayName, { exact: true })).toBeVisible();
    await expect(customerHeader).toHaveCSS("border-left-width", "1px");
    const dealerBox = (await dealerHeader.boundingBox())!;
    const customerBox = (await customerHeader.boundingBox())!;
    expect(customerBox.x).toBeGreaterThan(dealerBox.x);
    expect(Math.abs(customerBox.y - dealerBox.y)).toBeLessThan(2);
    const summary = printable.locator(".receipt-summary");
    await expect(summary.locator("dt")).toHaveText(["Receipt number", "Received (Central)", "Amount received"]);
    await expect(summary).toContainText("$500.05");
    for (const value of ["Time Motor Sales, Inc.", "1101 E. Lake Street", "timemotors.net", "timemotorsale@gmail.com", "612-724-3631",
      buyer.displayName, buyer.customerNumber, buyer.phoneNumber!, buyer.email!, buyer.address!]) {
      await expect(printable.getByText(value).first()).toBeVisible();
    }
    await expect(printable.getByText(/There is no automatic forfeiture/)).toBeVisible();
    await expect(receiptOptions).toBeHidden();
    const printedPdf = await PDFDocument.load(await page.pdf({ format: "Letter" }));
    expect(printedPdf.getPageCount()).toBe(1);
    await page.emulateMedia({ media: "screen" });
    const row = page.getByRole("list", { name: "Saved deposits" }).getByRole("listitem").filter({ hasText: "$500.05" });
    await ready(row.getByText("$500.05 · VIN reservation recorded", { exact: true })).toBeVisible();
    const attachment = await page.request.get(receipt + "&download=1");
    expect(attachment.headers()["content-disposition"]).toContain(".pdf");
    expect((await PDFDocument.load(await attachment.body())).getPageCount()).toBe(1);
    const phoneReceipt = await page.context().newPage();
    try {
      await phoneReceipt.setViewportSize({ width: 390, height: 844 });
      await phoneReceipt.goto(receipt);
      const seller = phoneReceipt.locator(".receipt-dealer");
      const customer = phoneReceipt.locator(".receipt-customer");
      await expect(customer).toHaveCSS("border-left-width", "0px");
      await expect(customer).toHaveCSS("border-top-width", "1px");
      expect((await customer.boundingBox())!.y).toBeGreaterThan((await seller.boundingBox())!.y);
    } finally { await phoneReceipt.close(); }
    await db.customer.update({ where: { id: buyer.id }, data: { email: "new-deposit-contact@example.test" } });
    await page.reload();
    await ready(row.getByText("$500.05 · VIN reservation recorded", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Receipt options" }).click();
    const reprint = await page.request.get(receipt);
    expect(await reprint.text()).toContain(buyer.email!);
    expect(await reprint.text()).not.toContain("new-deposit-contact@example.test");
    const response = await page.request.post(endpoint, { data: { id: saved.id, action: "receive", amount: "500.05", method: "OTHER_CARD",
      kind: "RESERVATION", ...agreement, vehicleId: vehicle.id, nonRefundable: true, reference: cardRef, confirmed: true, termsPresented: true } });
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
      action: "receive", id: randomUUID(), amount: "350", method: "CASH", kind: "RESERVATION", ...agreement, vehicleId: vehicle.id, confirmed: true, termsPresented: true
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

    const second = await page.request.post(endpoint, { data: { action: "receive", id: randomUUID(), amount: "250", method: "CASH", kind: "RESERVATION", ...agreement, vehicleId: vehicleForBuyer.id, confirmed: true, termsPresented: true } });
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
    for (const name of ["Cash", "Credit card", "Debit card", "Other card", "Check", "Wire transfer", "Other payment"]) {
      await expect(form.getByRole("option", { name, exact: true })).toHaveCount(1);
    }
    await form.getByLabel("Payment method").selectOption("ZELLE");
    await form.getByLabel("Transaction reference").fill("TEST-ZELLE-" + randomUUID().slice(0, 8));
    await form.getByLabel(/showed these terms/).check();
    await form.getByLabel(/verified that the payment/).check();
    const width = await form.evaluate(el => ({ scroll: el.scrollWidth, width: el.clientWidth }));
    expect(width.scroll).toBeLessThanOrEqual(width.width + 1);
    await form.getByRole("button", { name: "Record deposit and issue receipt" }).click();
    await ready(page.getByRole("heading", { name: "Deposit recorded" })).toBeVisible();
    await ready(page.getByText("$100.00 · Received", { exact: true })).toBeVisible();
    expect(await db.customerSalesDeposit.count({ where: { customerId: buyer.id, vehicleId: null, method: "ZELLE" } })).toBe(1);
    const events = await db.enterpriseAuditEvent.findMany({ where: { correlationId: saved.id }, select: { eventType: true } });
    expect(events.map(event => event.eventType).sort()).toEqual(["CUSTOMER_DEPOSIT_RECEIVED", "CUSTOMER_DEPOSIT_REFUNDED"]);
    console.log("[deposit-preview]", path);
  } finally { await db.$disconnect(); }
});
