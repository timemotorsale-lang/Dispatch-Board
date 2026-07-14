import { describe, expect, it } from "vitest";
import { normalizeClose, normalizeCustody, normalizePurchaseTransition, normalizeReceipt, normalizeRecoveryTransition, normalizeTransfer } from "@/server/service-close-parts/domain";

const base = { idempotencyKey: "command-1", reason: "Record governed operational evidence." };

describe("service close and enterprise parts rules", () => {
  it("requires attributable physical handoff evidence to close", () => {
    expect(() => normalizeClose({ ...base, finalOdometer: 100, handoffEvidence: [], keysVerified: true, occurredAt: "2026-07-14T12:00:00Z", recipientName: "Customer" })).toThrow("evidence");
    expect(normalizeClose({ ...base, finalOdometer: 100, handoffEvidence: ["signature-1"], keysVerified: true, occurredAt: "2026-07-14T12:00:00Z", recipientName: "Customer" })).toMatchObject({ keysVerified: true, recipientName: "Customer" });
  });

  it("enforces purchase-order state transitions", () => {
    expect(normalizePurchaseTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "APPROVED" }, "DRAFT")).toMatchObject({ toStatus: "APPROVED" });
    expect(() => normalizePurchaseTransition({ ...base, occurredAt: "2026-07-14T12:00:00Z", toStatus: "CLOSED" }, "DRAFT")).toThrow("cannot transition");
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
});
