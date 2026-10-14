import { describe, expect, it } from "vitest";
import { intakePending, normalizeIntake } from "@/server/inventory-unit/intake-domain";

const now = new Date("2026-10-07T12:00:00Z");
const details = { source: "AUCTION", seller: "Synthetic seller", boughtFrom: "Synthetic auction", buyer: "Synthetic buyer", acquiredOn: "2026-10-01", reference: "invoice-1", priceStatus: "INCURRED", purchaseCents: 1000000, proposedPriceCents: 1500000, whereabouts: "Receiving lane", odometer: 50000, odometerUnit: "MILES", condition: "Runs; bumper damage recorded", keys: 2, titleStatus: "RECEIVED", documents: "Invoice attached", pendingNotes: "" };
const body = { details, status: "CONFIRMED", expectedVersion: 0, expectedUnitVersion: 1, idempotencyKey: "intake-1", reason: "Record an acquisition intake" };
describe("guided inventory intake", () => {
  it("records a complete handoff without adding implied authorization", () => { expect(normalizeIntake(body, now)).toMatchObject({ status: "CONFIRMED", pendingItems: [], details }); });
  it("saves incomplete drafts without inventing facts", () => { expect(normalizeIntake({ ...body, status: "DRAFT", details: { ...details, seller: "", purchaseCents: null, priceStatus: "PENDING" } }, now).pendingItems).toEqual(["Seller", "Purchase price"]); });
  it("requires a meaningful pending follow-up for confirmation", () => {
    expect(() => normalizeIntake({ ...body, details: { ...details, titleStatus: "ISSUE" } }, now)).toThrow("Explain pending");
    expect(normalizeIntake({ ...body, details: { ...details, titleStatus: "ISSUE", pendingNotes: "Owner will reconcile title documents" } }, now).pendingItems).toEqual(["Title"]);
  });
  it.each([{ whereabouts: "" }, { condition: "ok" }])("requires receiving context %j before confirmation", override => { expect(() => normalizeIntake({ ...body, details: { ...details, ...override } }, now)).toThrow("handoff"); });
  it.each([{ purchaseCents: 0 }, { purchaseCents: 1.5 }, { proposedPriceCents: -1 }, { acquiredOn: "2026-02-30" }, { acquiredOn: "2026-10-08" }, { odometer: -1 }, { keys: 101 }, { priceStatus: "PENDING" }])("rejects invalid intake values %j", override => { expect(() => normalizeIntake({ ...body, details: { ...details, ...override } }, now)).toThrow(); });
  it("does not require a speculative selling price or fixed pack", () => { expect(intakePending({ ...details, proposedPriceCents: null })).toEqual([]); });
});
