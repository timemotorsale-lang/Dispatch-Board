import { expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { serviceInvoiceCandidate } from "@/server/service-close-parts/invoice-candidate";

vi.mock("@/server/quality-control/vendor-acceptance", () => ({ acceptedVendorReturns: async () => [] }));

it("invoices approved description-only parts at the saved price after QC", async () => {
  const estimate = {
    id: "estimate", expiresAt: new Date("2026-12-01"), laborSubtotalCents: 6250,
    partsSubtotalCents: 16000, feeSubtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 22250,
    lineItems: [
      { key: "labor", type: "LABOR", description: "Mount tires", quantity: 1, unitPriceCents: 6250 },
      { key: "tires", type: "PART", description: "Front tires", quantity: 2, unitPriceCents: 8000, laborLineKey: "labor" },
    ],
  };
  const order = {
    origin: "CUSTOMER_REPAIR", estimateVersions: [estimate],
    authorizations: [{ id: "approval", disposition: "ACCEPTED", estimateVersionId: estimate.id, decidedAt: new Date("2026-11-12"), authorizedLineKeys: ["labor", "tires"], authorizedAmountCents: 22250 }],
    repairJobs: [{
      id: "job", status: "QC_PASSED", estimateVersionId: estimate.id, authorizationId: "approval", authorizedLineKey: "labor", partsRequired: true,
      qualityInspections: [{ disposition: "PASSED", safetyChecksPassed: true, inspectedAt: new Date("2026-11-13") }],
      laborClocks: [{ state: "FINISHED", finishedAt: new Date("2026-11-12"), accumulatedMinutes: 30 }],
      partCustodyEvents: [],
    }],
  };
  const database = {
    repairOrder: { findFirst: async () => order },
    serviceDocument: { findFirst: async () => ({ content: { identity: {} }, sha256: "hash" }) },
  } as unknown as Prisma.TransactionClient;
  const result = await serviceInvoiceCandidate(database, "org", "ro");
  expect(result.mismatchCodes).toEqual([]);
  expect(result.ledger.totalCents).toBe(22250);
  order.origin = "INVENTORY_RECON";
  order.repairJobs[0].laborClocks.length = 0;
  const internalDatabase = { ...database, serviceDocument: { findFirst: async () => null } } as unknown as Prisma.TransactionClient;
  expect((await serviceInvoiceCandidate(internalDatabase, "org", "ro")).mismatchCodes).toEqual([]);
  order.repairJobs[0].status = "READY_FOR_QC";
  expect((await serviceInvoiceCandidate(internalDatabase, "org", "ro")).mismatchCodes).toContain("INVOICE_JOB_QC_INCOMPLETE");
});
