import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { moneyToday } from "../../lib/money-resources";
import { rentalReceiptHref } from "../../lib/rental-payment";

test("records received rental money once and reopens its branded receipt", async ({ page, playwright, baseURL }) => {
  test.skip(process.env.RUN_DEAL_CONTINUITY_INTEGRATION !== "1", "Requires a disposable migrated and seeded database.");
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !/^deal_staging_\d+$/.test(database.searchParams.get("schema") ?? "")) {
    throw new Error("Run rental payments with an isolated loopback deal_staging schema.");
  }
  test.setTimeout(120_000);
  const prisma = new PrismaClient({ datasourceUrl: database.toString() });
  const guest = await playwright.request.newContext({ baseURL });
  try {
    await page.route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: { error: "Outside rental payment review" } }));
    const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
    expect(login.ok()).toBe(true);
    const { user } = await (await page.request.get("/api/auth/me")).json();
    const id = randomUUID(), name = `Rental payment test ${id.slice(0, 8)}`, organizationId = process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID!;
    const customer = await prisma.customer.create({ data: { organizationId, customerNumber: id, displayName: name } });
    const draft = await prisma.dealDeskDraft.create({ data: { id, ownerUserId: user.id, organizationId, customerId: customer.id, customerName: name,
      vehicleReference: "2022 Honda Civic · Test vehicle", pathway: "daily-rental", snapshot: {} } });
    const businessDate = moneyToday(), dealApi = "/api/crm/v1/deal-drafts";
    const transfer = { action: "DEAL_RENTAL_PAYMENT", draftId: id, draftRevision: draft.revision, confirmed: true,
      operationKey: randomUUID(), method: "CARD_TERMINAL", reference: `APP-${id.slice(0, 8)}`, amountCents: 2500, businessDate };
    const blocked = await page.request.patch(dealApi, { data: { ...transfer, confirmed: false } });
    expect(blocked.status()).toBe(400);
    expect(await blocked.text()).toContain("Confirm the payment was received");
    const missingReference = await page.request.patch(dealApi, { data: { ...transfer, reference: "" } });
    expect(missingReference.status()).toBe(400);
    expect(await prisma.documentLibraryAuditEvent.count({ where: { subjectId: id, action: "DEAL_FINANCIAL_RECORDED" } })).toBe(0);

    const dealsUrl = `/crm-next/deals?area=rentals&search=${encodeURIComponent(name)}`;
    async function openMoney() {
      await page.goto(dealsUrl);
      const row = page.getByRole("row").filter({ hasText: name });
      await row.getByRole("button", { name: `Actions for ${name}` }).click();
      await page.getByRole("menuitem", { name: `Deal details for ${name}` }).click();
      const drawer = page.getByRole("dialog", { name: `Deal details · ${name}` });
      await drawer.getByRole("tab", { name: "Money" }).click();
      return drawer.getByRole("tabpanel", { name: "Money" });
    }
    const money = await openMoney();
    await money.getByRole("button", { name: "Collect payment", exact: true }).click();
    const form = money.getByRole("form", { name: "Rental payment" });
    await form.getByLabel("Amount received (USD)").fill("75.00");
    await form.getByLabel("I confirmed this payment was received.").check();
    await form.getByRole("button", { name: "Record payment & issue receipt" }).click();
    const latest = money.getByRole("link", { name: "Open latest receipt" });
    await expect(latest).toBeVisible();
    const receiptUrl = (await latest.getAttribute("href"))!;
    const pdf = await page.request.get(receiptUrl);
    expect(pdf.ok(), pdf.statusText()).toBe(true);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect(pdf.headers()["cache-control"]).toContain("no-store");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await guest.get(receiptUrl)).status()).toBe(401);
    const stored = new URL(receiptUrl, baseURL);
    stored.searchParams.set("draftId", randomUUID());
    expect((await page.request.get(stored.toString())).status()).toBe(404);

    const duplicate = await Promise.all([1, 2].map(() => page.request.patch(dealApi, { data: transfer })));
    for (const response of duplicate) expect(response.ok(), await response.text()).toBe(true);
    expect(await duplicate[0].json()).toEqual(await duplicate[1].json());
    const reusedReference = await page.request.patch(dealApi, { data: { ...transfer, operationKey: randomUUID() } });
    expect(reusedReference.status()).toBe(409);
    expect(await prisma.documentLibraryAuditEvent.count({ where: { subjectId: id, action: "DEAL_FINANCIAL_RECORDED" } })).toBe(2);
    const reopened = await openMoney();
    await expect(reopened.getByRole("region", { name: "Rental receipts" }).getByRole("link")).toHaveCount(2);
    await expect(reopened.getByText("$100.00", { exact: true })).toBeVisible();
    await expect(reopened.getByRole("link", { name: /Open receipt · \$75\.00/ })).toHaveAttribute("href", receiptUrl);

    const refund = await page.request.patch(dealApi, { data: { action: "DEAL_FINANCIAL", draftId: id, draftRevision: draft.revision,
      operationKey: randomUUID(), kind: "REFUND", originalId: stored.searchParams.get("paymentId"), amountCents: 1500,
      businessDate, reference: "REFUND-1", evidence: "Test register refund", reason: "Test adjustment", confirmed: true } });
    expect(refund.ok(), await refund.text()).toBe(true);
    const corrected = await openMoney();
    await expect(corrected.getByText("$85.00", { exact: true })).toBeVisible();
    const reissued = await page.request.get(receiptUrl);
    expect(reissued.ok()).toBe(true);
    expect(reissued.headers()["content-disposition"]).toBe(pdf.headers()["content-disposition"]);

    const updatedName = "测试客户";
    await prisma.customer.update({ where: { id: customer.id }, data: { displayName: updatedName } });
    const additional = await page.request.patch(dealApi, { data: { ...transfer, operationKey: randomUUID(), method: "CASH", reference: "", amountCents: 100 } });
    expect(additional.ok(), await additional.text()).toBe(true);
    const { receiptId } = await additional.json();
    const printable = await page.request.get(rentalReceiptHref(id, receiptId));
    expect(printable.headers()["content-type"]).toContain("text/html");
    expect(printable.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(await printable.text()).toContain(updatedName);
    expect((await page.request.get(receiptUrl)).headers()["content-type"]).toBe("application/pdf");
    expect(await prisma.vehicleUseBooking.count({ where: { contextId: id } })).toBe(0);
  } finally {
    await guest.dispose();
    await prisma.$disconnect();
  }
});
