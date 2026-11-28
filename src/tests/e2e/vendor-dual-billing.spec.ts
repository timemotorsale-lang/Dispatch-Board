import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212", "Requires the isolated local preview.");
test.use({ actionTimeout: 15000 });

test("balance cards lead to the right draft and posting updates only its own balance", async ({ page }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  try {
    const tag = "VENDOR-CARDS-" + randomUUID().slice(0, 8);
    const vendor = await db.vendor.create({ data: { organizationId: "org-time-motor-sales", vendorNumber: tag, name: "Synthetic balance cards vendor", normalizedName: tag, category: "TIRE_VENDOR" } });
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    const path = `/customers/vendors/${vendor.id}`;
    await page.goto(path);
    const panel = page.getByRole("region", { name: "Vendor billing and agreements" });
    const receivable = panel.getByRole("region", { name: "They owe us", exact: true });
    const payable = panel.getByRole("region", { name: "We owe them", exact: true });
    for (const incoming of [false, true]) {
      const card = incoming ? payable : receivable;
      const other = incoming ? receivable : payable;
      const label = incoming ? "Receive vendor bill" : "Bill vendor";
      const number = tag + (incoming ? "-IN" : "-OUT");
      await card.getByRole("button", { name: label, exact: true }).click();
      const invoice = panel.getByRole("dialog", { name: label });
      await invoice.getByLabel(incoming ? "Vendor invoice number" : "Our invoice number").fill(number);
      await invoice.getByLabel("Description", { exact: true }).first().fill("Synthetic invoice");
      await invoice.getByLabel("Original invoice / agreement reference").fill(number + "-SOURCE");
      await invoice.getByLabel("Description", { exact: true }).last().fill("Synthetic supply line");
      await invoice.getByLabel("Amount", { exact: true }).fill(incoming ? "75" : "125");
      if (incoming) await invoice.getByLabel(/Reason for lines without work tickets/).fill("Supplies, not a vehicle repair");
      await invoice.getByRole("button", { name: label, exact: true }).click();
      await expect(panel.getByRole("status").filter({ hasText: "Not included in the balance yet" })).toBeVisible();
      await expect(card.getByText("$0.00", { exact: true })).toBeVisible();
      if (incoming) await page.reload();
      const review = card.getByRole("button", { name: incoming ? "Review vendor bill drafts (1)" : "Review outgoing drafts (1)" });
      await review.click();
      await expect(panel.getByLabel("Drafts only")).toBeChecked();
      if (incoming) await panel.getByLabel(`Actions for ${number}`).selectOption("POST_DOCUMENT");
      else await panel.getByRole("button", { name: `Review saved draft ${number}` }).click();
      const approval = panel.getByRole("dialog", { name: "Approve and post invoice" });
      await expect(approval.getByText(number, { exact: true })).toBeVisible();
      await approval.getByRole("button", { name: "Approve and post invoice" }).click();
      await expect(panel.getByRole("status").filter({ hasText: incoming ? "We owe them now includes" : "They owe us now includes" })).toBeVisible();
      await expect(card.getByText(incoming ? "$75.00" : "$125.00", { exact: true })).toBeVisible();
      await expect(other.getByText(incoming ? "$125.00" : "$0.00", { exact: true })).toBeVisible();
    }
    await page.reload();
    await expect(receivable.getByText("$125.00", { exact: true })).toBeVisible();
    await expect(payable.getByText("$75.00", { exact: true })).toBeVisible();
    expect(await db.vendorBillingDocument.count({ where: { vendorId: vendor.id, status: "POSTED" } })).toBe(2);
    expect(await db.vendorBillingSettlement.count({ where: { vendorId: vendor.id } })).toBe(0);
  } finally {
    await db.$disconnect();
  }
});

test("a vendor repair payment and company loan principal remain separately recorded", async ({ page, playwright, baseURL }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  try {
    const organizationId = "org-time-motor-sales", tag = "VENDOR-DEMO-" + randomUUID().slice(0, 8);
    const vendor = await db.vendor.create({ data: { organizationId, vendorNumber: tag, name: "Synthetic repair and lending vendor", normalizedName: tag, category: "TIRE_VENDOR" } });
    const vehicle = await db.vehicle.create({ data: { organizationId, vehicleNumber: tag, year: 2022, make: "Toyota", model: "Camry" } });
    const work = await db.vendorWorkJob.create({ data: { organizationId, vendorId: vendor.id, jobNumber: tag, vehicleReference: "Synthetic Toyota", workType: "Repair", serviceDate: new Date("2026-07-02"), amount: 600 } });
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    expect((await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } })).ok()).toBe(true);
    const url = `/api/vendors/${vendor.id}/billing`, path = `/customers/vendors/${vendor.id}`;
    const command = async (action: string, data: Record<string, unknown>) => {
      const response = await page.request.post(url, { data: { ...data, action, commandKey: randomUUID() } });
      expect(response.ok(), await response.text()).toBe(true);
    };
    await command("REVIEW_WORK", { workJobId: work.id, vehicleId: vehicle.id, approvedAmount: "600", evidenceReference: "Synthetic acceptance", accepted: true });
    for (const [number, amount] of [["REPAIR-A", "400"], ["REPAIR-B", "200"]]) {
      await command("CREATE_DOCUMENT", { direction: "PAYABLE", number, title: "Synthetic repair", issueDate: "2026-07-02", dueDate: "2026-07-12",
        sourceReference: tag + number, lines: [{ description: "Approved repair", amount, workJobId: work.id }] });
      const bill = await db.vendorBillingDocument.findFirstOrThrow({ where: { vendorId: vendor.id, number } });
      await command("POST_DOCUMENT", { documentId: bill.id, version: bill.version });
    }
    await page.goto(path);
    const panel = page.getByRole("region", { name: "Vendor billing and agreements" });
    await panel.getByRole("region", { name: "They owe us" }).getByRole("button", { name: "Record existing loan" }).click();
    const setup = page.getByRole("dialog", { name: "Set up company loan schedule" });
    for (const [label, value] of [
      ["Loan name", "Synthetic company loan"], ["Principal to record", "60000"], ["Monthly principal installment", "10000"],
      ["Date principal was funded or recognized", "2026-06-30"], ["First contractual due date", "2026-07-01"],
      ["Signing date (optional)", "2026-07-15"], ["Signed agreement reference", "SYNTHETIC-NOTE-" + tag]
    ]) await setup.getByLabel(label, { exact: true }).fill(value);
    await setup.getByLabel(/the installment shown is entirely principal/).check();
    await setup.getByRole("button", { name: "Set up company loan schedule" }).click();
    await expect(panel.getByText(/No payment has been recorded/)).toBeVisible();
    const principal = await db.vendorBillingDocument.findFirstOrThrow({ where: { vendorId: vendor.id, kind: "OPENING_BALANCE" }, include: { dueItems: true } });
    expect(principal.amountCents).toBe(6000000);
    expect(principal.issueDate.toISOString().slice(0, 10)).toBe("2026-06-30");
    expect(principal.dueItems.map(row => row.dueDate.toISOString().slice(0, 10)).sort()).toEqual(["2026-07-01","2026-08-01","2026-09-01","2026-10-01","2026-11-01","2026-12-01"]);
    await expect(panel.getByText("2026-12-01", { exact: true })).toBeVisible();
    const statement = await page.request.get(`${url}?print=1&agreementId=${encodeURIComponent(principal.agreementId!)}`);
    expect(await statement.text()).toContain("Last due: 2026-12-01");
    expect(await db.vendorBillingSettlement.count({ where: { vendorId: vendor.id } })).toBe(0);
    const firstBill = await db.vendorBillingDocument.findFirstOrThrow({ where: { vendorId: vendor.id, number: "REPAIR-A" } });
    const offset = await page.request.post(url, { data: { action: "OFFSET", commandKey: randomUUID(), agreed: true,
      amount: "100", date: "2026-07-16", reference: tag + "-OFFSET", reason: "Synthetic denied offset",
      allocations: [{ documentId: principal.id, amount: "100" }, { documentId: firstBill.id, amount: "100" }] } });
    expect(offset.status()).toBe(400);
    expect(await offset.text()).toContain("cannot be offset");
    const badDate = await page.request.post(url, { data: { action: "CREATE_AGREEMENT", commandKey: randomUUID(), companyLoan: true,
      principalOnlyConfirmed: true, direction: "RECEIVABLE", kind: "REPAYMENT", title: "Synthetic invalid ordering",
      amount: "10000", principal: "60000", principalDate: "2026-07-15", startDate: "2026-07-01", terms: tag + "-BAD-DATE" } });
    expect(badDate.status()).toBe(400);
    expect(await badDate.text()).toContain("cannot precede");
    await panel.getByRole("button", { name: "Record repair batch payment" }).click();
    const batch = page.getByRole("dialog", { name: "Record repair batch payment" });
    await batch.getByLabel("Payment date").fill("2026-07-16");
    await batch.getByLabel("Bank or check reference").fill(tag + "-OUT");
    await batch.getByLabel("Actual bank payment").fill("500");
    await batch.getByLabel(/REPAIR-A/).check();
    await batch.getByLabel(/REPAIR-B/).check();
    await batch.getByLabel(/allocations match the bank record/).check();
    await batch.getByRole("button", { name: "Record repair batch payment" }).click();
    await expect(batch.getByRole("alert")).toHaveText(/must add up to the actual bank payment/);
    expect(await db.vendorBillingSettlement.count({ where: { vendorId: vendor.id } })).toBe(0);
    await batch.getByLabel("Amount for REPAIR-B").fill("100");
    await batch.getByLabel(/allocations match the bank record/).check();
    await batch.getByRole("button", { name: "Record repair batch payment" }).click();
    await expect(panel.getByText(/Batch payment recorded/)).toBeVisible();
    const payment = await db.vendorBillingSettlement.findFirstOrThrow({ where: { vendorId: vendor.id, kind: "PAYMENT" }, include: { allocations: true } });
    expect(payment.amountCents).toBe(50000);
    expect(payment.allocations.map(row => row.amountCents).sort((a,b)=>a-b)).toEqual([10000,40000]);
    expect(payment.allocations.some(row => row.documentId === principal.id)).toBe(false);

    await panel.getByRole("button", { name: "Record loan principal received" }).click();
    const receipt = page.getByRole("dialog", { name: "Record loan principal received" });
    await receipt.getByLabel("Principal received").fill("10000");
    await receipt.getByLabel("Actual receipt date").fill("2026-07-17");
    await receipt.getByLabel("Bank or check reference").fill(tag + "-IN");
    await receipt.getByLabel(/this principal payment was received/).check();
    await receipt.getByRole("button", { name: "Record loan principal received" }).click();
    await expect(panel.getByText(/Principal repayment recorded/)).toBeVisible();
    await page.reload();
    const totals = await (await page.request.get(url)).json();
    expect(totals.summary).toMatchObject({ receivableCents: 5000000, payableCents: 10000 });
    expect(totals.settlements).toHaveLength(2);
    const sales = await playwright.request.newContext({ baseURL });
    try {
      expect((await sales.post("/api/auth/login", { data: { email: "jordan.sales@local.test", password: "dispatch123!" } })).ok()).toBe(true);
      const denied = await sales.post(url, { data: { action: "PAYMENT", commandKey: randomUUID(), confirmed: true, amount: "1", date: "2026-07-17", reference: tag + "-DENIED" } });
      expect(denied.status()).toBe(403);
    } finally { await sales.dispose(); }
    console.log("[vendor-billing-preview]", path);
  } finally { await db.$disconnect(); }
});
