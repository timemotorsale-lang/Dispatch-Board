import { describe, expect, it } from "vitest";
import { assertIndependentPartsApproval, normalizeClose, normalizeCustody, normalizePurchaseRevision, normalizePurchaseTransition, normalizeReceipt, normalizeRecoveryTransition, normalizeTransfer } from "@/server/service-close-parts/domain";
import { assertPurchaseOrderDuplicateGate, evaluatePurchaseOrderDuplicateGate } from "@/server/service-close-parts/purchase-order-control";

const base = { idempotencyKey: "command-1", reason: "Record governed operational evidence." };

describe("service close and enterprise parts rules", () => {
  it("requires independent actors at consequential approval boundaries", () => {
    expect(() => assertIndependentPartsApproval("PURCHASE_APPROVAL", "user-1", "user-1")).toThrow("different authorized user");
    expect(() => assertIndependentPartsApproval("TRANSFER_RELEASE", "user-1", "user-1")).toThrow("different authorized user");
    expect(() => assertIndependentPartsApproval("RECOVERY_WRITE_OFF", "user-1", "user-1")).toThrow("different authorized user");
    expect(() => assertIndependentPartsApproval("PURCHASE_APPROVAL", "user-1", "user-2")).not.toThrow();
  });
  it("requires attributable physical handoff evidence to close", () => {
    expect(() => normalizeClose({ ...base, finalOdometer: 100, handoffEvidence: [], keysVerified: true, occurredAt: "2026-07-14T12:00:00Z", recipientName: "Customer" })).toThrow("evidence");
    expect(normalizeClose({ ...base, finalOdometer: 100, handoffEvidence: ["signature-1"], keysVerified: true, occurredAt: "2026-07-14T12:00:00Z", recipientName: "Customer" })).toMatchObject({ keysVerified: true, recipientName: "Customer" });
  });

  it("enforces purchase-order state transitions", () => {
    expect(normalizePurchaseTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "APPROVED" }, "DRAFT")).toMatchObject({ toStatus: "APPROVED" });
    expect(() => normalizePurchaseTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "CLOSED" }, "DRAFT")).toThrow("cannot transition");
  });

  it("allows controlled pre-issue revision and rejects post-issue change", () => {
    expect(normalizePurchaseRevision({ ...base, lines: [{ partId: "part", quantity: 2, unitCostCents: 125 }] }, "APPROVED")).toMatchObject({ lines: [{ quantity: 2, unitCostCents: 125 }] });
    expect(() => normalizePurchaseRevision({ ...base, lines: [{ partId: "part", quantity: 2, unitCostCents: 125 }] }, "ISSUED")).toThrow("cannot be revised");
  });

  it("rejects damaged receipt quantity above receipt quantity", () => {
    expect(() => normalizeReceipt({ ...base, lines: [{ damagedQuantity: 2, partId: "part", quantity: 1, unitCostCents: 100 }], packingSource: "slip", receivedAt: "2026-07-14T12:00:00Z", stockLocationId: "bin" })).toThrow("cannot exceed");
  });

  it("requires installation evidence and distinct transfer locations", () => {
    expect(() => normalizeCustody({ ...base, evidence: [], occurredAt: "2026-07-14T12:00:00Z", partId: "part", quantity: 1, repairJobId: "job", sourceId: "install-1", stockLocationId: "bin", type: "INSTALL" })).toThrow("Installation evidence");
    expect(() => normalizeTransfer({ ...base, fromStockLocationId: "bin", lines: [{ partId: "part", quantity: 1, unitCostCents: 100 }], locationId: "location", toStockLocationId: "bin", transferNumber: "transfer-1" })).toThrow("must differ");
  });

  it("requires actual credit or a dispute reason at recovery decisions", () => {
    expect(() => normalizeRecoveryTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "CREDITED" }, "ACKNOWLEDGED")).toThrow("actual credit");
    expect(() => normalizeRecoveryTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "DISPUTED" }, "SHIPPED")).toThrow("dispute reason");
  });

  it("blocks duplicate-risk purchase orders until a specific override reason is recorded", () => {
    const input = {
      facts: [
        { id: "demand-1", label: "RO-1001", partId: "part-1", type: "ACTIVE_DEMAND" as const },
        { id: "po-1", label: "PO-1001 (ACKNOWLEDGED)", partId: "part-1", type: "OPEN_PURCHASE_ORDER" as const },
        { id: "receipt-1:0", label: "PO-1001 receipt line 1", partId: "part-1", type: "RECEIVED_UNISSUED" as const }
      ],
      lines: [{ partId: "part-1", quantity: 1, unitCostCents: 1000 }]
    };

    expect(evaluatePurchaseOrderDuplicateGate(input)).toMatchObject({
      allowed: false,
      requiredOverride: true
    });
    expect(() => assertPurchaseOrderDuplicateGate(input)).toThrow("duplicate-control review required");
    expect(assertPurchaseOrderDuplicateGate({
      ...input,
      duplicateOverrideReason: "Customer approved a second axle set after reviewing the existing PO and receipt."
    })).toMatchObject({ allowed: true, conflicts: expect.any(Array) });
  });

  it("does not treat the demand behind the selected requisition as a duplicate by itself", () => {
    expect(evaluatePurchaseOrderDuplicateGate({
      allowedDemandIds: ["demand-1"],
      facts: [{ id: "demand-1", label: "RO-1001", partId: "part-1", type: "ACTIVE_DEMAND" }],
      lines: [{ partId: "part-1", quantity: 1, unitCostCents: 1000 }]
    })).toMatchObject({
      allowed: true,
      conflicts: []
    });
  });
});
