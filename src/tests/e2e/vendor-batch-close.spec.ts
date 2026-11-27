import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.skip(process.env.PLAYWRIGHT_CAMERA_PREVIEW !== "isolated" || process.env.PLAYWRIGHT_BASE_URL !== "http://127.0.0.1:3212", "Requires the isolated local preview.");

test("closes repair batches with or without an invoice number without recording a payment", async ({ page }) => {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "55435" || dbUrl.pathname !== "/camera_preview") throw new Error("Isolated database required.");
  const db = new PrismaClient();
  const organizationId = "org-time-motor-sales";
  const tag = "BATCH-CLOSE-" + randomUUID().slice(0, 8);
  let vendorId: string | undefined;
  try {
    const vendor = await db.vendor.create({ data: {
      organizationId, vendorNumber: tag, name: "Synthetic batch close vendor", normalizedName: tag, category: "TIRE_VENDOR"
    } });
    vendorId = vendor.id;
    const scope = { organizationId, vendorId };
    await page.context().route("**/api/coo-workbook/rhythm*", route => route.fulfill({ status: 503, json: {} }));
    const login = await page.request.post("/api/auth/login", { data: { email: "morgan.manager@local.test", password: "dispatch123!" } });
    expect(login.ok()).toBe(true);

    for (const invoiceNumber of ["", tag + "-INVOICE"]) {
      const batchNumber = tag + (invoiceNumber ? "-2" : "-1");
      const batch = await db.vendorInvoiceBatch.create({ data: { ...scope, batchNumber, title: "Synthetic repair batch" } });
      const jobData = { ...scope, batchId: batch.id, vehicleReference: "Synthetic Toyota", workType: "Repair", serviceDate: new Date("2026-07-02"), amount: 150 };
      const job = await db.vendorWorkJob.create({ data: { ...jobData, jobNumber: batchNumber + "-LIVE", status: "BATCHED" } });
      const cancelled = await db.vendorWorkJob.create({ data: { ...jobData, jobNumber: batchNumber + "-CANCELLED", status: "CANCELLED" } });

      await page.goto(`/customers/vendors/${vendorId}`);
      await page.getByLabel("Active vendor work batch").selectOption(batch.id);
      await page.getByLabel("Invoice number", { exact: true }).fill(invoiceNumber);
      const response = page.waitForResponse(res => res.url().endsWith(`/invoice-batches/${batch.id}/close`) && res.request().method() === "POST");
      await page.getByRole("button", { name: "Close batch", exact: true }).click();
      const closed = await response;
      expect(closed.ok(), await closed.text()).toBe(true);
      await expect(page.getByText(/^Batch closed /)).toBeVisible();
      expect(await db.vendorInvoiceBatch.findUniqueOrThrow({ where: { id: batch.id } })).toMatchObject({
        status: invoiceNumber ? "INVOICED" : "CLOSED", invoiceNumber: invoiceNumber || null, closedAt: expect.any(Date)
      });
      expect(await db.vendorWorkJob.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: invoiceNumber ? "INVOICED" : "BATCHED" });
      expect(await db.vendorWorkJob.findUniqueOrThrow({ where: { id: cancelled.id } })).toMatchObject({ status: "CANCELLED" });
    }
    expect(await db.vendorBillingSettlement.count({ where: { vendorId } })).toBe(0);
  } finally {
    try {
      if (vendorId) await db.vendor.delete({ where: { id: vendorId } });
    } finally {
      await db.$disconnect();
    }
  }
});
