import { describe, expect, it } from "vitest";
import { depositSourceAvailable, repairDepositBalance, type RepairDepositEntry } from "@/server/service-billing/deposit-ledger";
const entry = (id: string, kind: RepairDepositEntry["kind"], amountCents: number, relatedEntryId: string | null = null): RepairDepositEntry => ({ id, kind, amountCents, relatedEntryId, organizationId: "org", repairOrderId: "ro", invoiceId: ["APPLY", "UNAPPLY"].includes(kind) ? "invoice" : null, invoiceEntryId: ["APPLY", "UNAPPLY"].includes(kind) ? `payment-${id}` : null, method: "CASH", reference: id, evidence: {}, occurredAt: new Date(), createdAt: new Date(), createdByUserId: "staff", reason: "Synthetic evidence" });
describe("immutable repair deposit accounting", () => {
  it("preserves collection, application, reversal, refund and reapplication without double counting", () => {
    const rows = [entry("collection", "COLLECTION", 10000), entry("apply", "APPLY", 6000, "collection")];
    expect(repairDepositBalance(rows)).toEqual({ collectedCents: 10000, refundedCents: 0, appliedCents: 6000, availableCents: 4000 });
    rows.push(entry("reverse", "UNAPPLY", 2000, "apply"), entry("refund", "REFUND", 1000, "collection"), entry("reapply", "APPLY", 3000, "collection"));
    expect(repairDepositBalance(rows)).toEqual({ collectedCents: 10000, refundedCents: 1000, appliedCents: 7000, availableCents: 2000 });
    expect(depositSourceAvailable(rows, "collection")).toBe(2000);
  });
  it("does not spend another collection's available money", () => {
    const rows = [entry("a", "COLLECTION", 100), entry("b", "COLLECTION", 1000), entry("use", "APPLY", 101, "a")];
    expect(() => repairDepositBalance(rows)).toThrow("exceeds collected");
  });
  it("rejects over-refunds, excess reversals and an unrelated invoice", () => {
    const rows = [entry("a", "COLLECTION", 1000), entry("use", "APPLY", 800, "a")];
    expect(() => repairDepositBalance([...rows, entry("refund", "REFUND", 201, "a")])).toThrow();
    expect(() => repairDepositBalance([...rows, entry("reverse", "UNAPPLY", 801, "use")])).toThrow();
    expect(() => repairDepositBalance([...rows, { ...entry("reverse", "UNAPPLY", 1, "use"), invoiceId: "other" }])).toThrow();
  });
  it.each([0, -1, 1.5, NaN, 2147483648])("rejects invalid cents %s", value => { expect(() => repairDepositBalance([entry("bad", "COLLECTION", value)])).toThrow(); });
});
