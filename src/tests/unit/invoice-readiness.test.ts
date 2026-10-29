import { describe, expect, it, vi } from "vitest";
import { serviceInvoiceCandidate } from "@/server/service-close-parts/invoice-candidate";

describe("read-only invoice readiness", () => {
  it("reports missing QC before an invoice package exists, without creating records", async () => {
    const estimate = { id: "estimate-1", version: 1, expiresAt: new Date("2026-12-01"), lineItems: [{ key: "labor-1", description: "Repair", type: "LABOR", quantity: 1, unitPriceCents: 25000, laborGuideMinutes: 120 }], laborSubtotalCents: 25000, partsSubtotalCents: 0, feeSubtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 25000 };
    const frozenIdentity = { customer: "Customer", color: "Gray", licensePlate: "ABC123", odometer: { reading: 125430, unit: "MILES", observedAt: "2026-10-28T15:00:00Z" } };
    const database = { repairOrder: { findFirst: vi.fn().mockResolvedValue({ estimateVersions: [estimate], authorizations: [{ id: "approval-1", estimateVersionId: estimate.id, disposition: "ACCEPTED", decidedAt: new Date("2026-10-28"), authorizedLineKeys: ["labor-1"], authorizedAmountCents: 25000 }], repairJobs: [] }) }, serviceDocument: { findFirst: vi.fn().mockResolvedValue({ sha256: "proof", content: { identity: frozenIdentity } }) } };
    const result = await serviceInvoiceCandidate(database as never, "org-1", "ro-1");
    expect(result.mismatchCodes).toContain("INVOICE_JOB_QC_INCOMPLETE");
    expect(result.ledger.totalCents).toBe(25000);
    expect(result.identity).toEqual(frozenIdentity);
  });
});
