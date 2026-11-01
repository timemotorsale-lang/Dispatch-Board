import { describe, expect, it } from "vitest";
import { dealAgeDays, dealDocumentHref, financialEntryError, summarizeDealFinancials, taskDealLink, type DealFinancialEntry } from "@/lib/deal-dashboard-enterprise";
const entry = (id: string, kind: DealFinancialEntry["kind"], amountCents: number, date = "2026-10-31", originalId: string | null = null): DealFinancialEntry => ({ id, kind, amountCents, businessDate: date, originalId, reference: id, evidence: "Verified bank record", reason: "Recorded verified transaction", actorName: "Manager", recordedAt: `${date}T18:00:00Z` });
describe("enterprise deal work indicators", () => {
  it("requires an explicit deal and organization link instead of a matching customer", () => {
    expect(taskDealLink({ customerId: "same-customer" })).toBeNull();
    expect(taskDealLink({ dealDashboard: { version: 1, organizationId: "org", draftId: "draft-1", jacketId: null } })?.draftId).toBe("draft-1");
    expect(taskDealLink({ dealDashboard: { version: 1, draftId: "draft-1" } })).toBeNull();
  });
  it("uses Chicago calendar days across daylight-saving changes", () => {
    expect(dealAgeDays("2026-10-31", new Date("2026-11-02T06:30:00Z"))).toBe(2);
    expect(dealAgeDays(null)).toBe(0);
    expect(dealDocumentHref("packet/1", "signed lease")).toBe("/sales-documents?jacketId=packet%2F1&requirementId=signed+lease#deal-document-action");
  });
});
describe("verified deal financial records", () => {
  it("does not invent an agreed amount or outstanding balance", () => {
    expect(summarizeDealFinancials([])).toMatchObject({ agreedCents: null, outstandingCents: null, entryCount: 0 });
  });
  it("keeps contract value, collections, refunds and balance distinct", () => {
    const entries = [entry("contract", "AGREED_AMOUNT", 200000), entry("payment", "PAYMENT", 50000), entry("refund", "REFUND", 10000, "2026-10-31", "payment")];
    expect(summarizeDealFinancials(entries)).toMatchObject({ agreedCents: 200000, collectedCents: 50000, refundedCents: 10000, netCents: 40000, outstandingCents: 160000, periodNetCents: 40000 });
    expect(financialEntryError(entries, { kind: "REFUND", amountCents: 40001, originalId: "payment" })).toContain("exceeds");
    expect(financialEntryError(entries, { kind: "REFUND", amountCents: 40000, originalId: "payment" })).toBeNull();
  });
  it("preserves a prior-period payment and reports its reversal in the correct period", () => {
    const entries = [entry("payment", "PAYMENT", 50000), entry("reverse", "REVERSAL", 50000, "2026-11-01", "payment")];
    expect(summarizeDealFinancials(entries, { start: "2026-10-01", end: "2026-10-31" })).toMatchObject({ periodPaymentsCents: 50000, periodReversalsCents: 0, periodNetCents: 50000, netCents: 0 });
    expect(summarizeDealFinancials(entries, { start: "2026-11-01", end: "2026-11-30" })).toMatchObject({ periodPaymentsCents: 0, periodReversalsCents: 50000, periodNetCents: -50000 });
    expect(financialEntryError(entries, { kind: "REVERSAL", amountCents: 50000, originalId: "payment" })).toContain("already been reversed");
  });
  it("requires refund reversals before a payment reversal, and preserves credit balances", () => {
    const entries = [entry("contract", "AGREED_AMOUNT", 40000), entry("payment", "PAYMENT", 50000), entry("refund", "REFUND", 10000, "2026-10-31", "payment")];
    expect(financialEntryError(entries, { kind: "REVERSAL", amountCents: 50000, originalId: "payment" })).toContain("refunds");
    entries.push(entry("refund-reversal", "REVERSAL", 10000, "2026-11-01", "refund"));
    expect(financialEntryError(entries, { kind: "REVERSAL", amountCents: 50000, originalId: "payment" })).toBeNull();
    expect(summarizeDealFinancials(entries)).toMatchObject({ netCents: 50000, creditCents: 10000, outstandingCents: 0 });
  });
  it.each([0, -100, 1.5, Number.MAX_SAFE_INTEGER])("rejects invalid cents %s", amountCents => expect(financialEntryError([], { kind: "PAYMENT", amountCents, originalId: null })).toContain("positive amount"));
  it("rejects cross-deal references and partial reversals", () => {
    expect(financialEntryError([], { kind: "REFUND", amountCents: 500, originalId: "other-deal-payment" })).toContain("same deal");
    expect(financialEntryError([entry("payment", "PAYMENT", 50000)], { kind: "REVERSAL", amountCents: 500, originalId: "payment" })).toContain("full original amount");
  });
  it("allows a documented zero obligation after cancellation while retaining payment and refund history", () => {
    const entries = [entry("contract", "AGREED_AMOUNT", 200000), entry("payment", "PAYMENT", 50000), entry("refund", "REFUND", 50000, "2026-11-01", "payment"), entry("cancelled-contract", "AGREED_AMOUNT", 0, "2026-11-01")];
    expect(financialEntryError(entries, { kind: "AGREED_AMOUNT", amountCents: 0, originalId: null })).toBeNull();
    expect(summarizeDealFinancials(entries)).toMatchObject({ agreedCents: 0, netCents: 0, outstandingCents: 0, collectedCents: 50000, refundedCents: 50000 });
  });
});
