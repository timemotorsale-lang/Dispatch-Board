import { describe, expect, it } from "vitest";
import { intakeConfirmationIssue, intakePending, normalizeIntake } from "@/server/inventory-unit/intake-domain";

const now = new Date("2026-10-07T12:00:00Z");
const details = { source: "AUCTION", seller: "Synthetic seller", boughtFrom: "Synthetic auction", buyer: "Synthetic buyer", acquiredOn: "2026-10-01", reference: "invoice-1", priceStatus: "INCURRED", purchaseCents: 1000000, proposedPriceCents: 1500000, whereabouts: "Receiving lane", odometer: 50000, odometerUnit: "MILES", condition: "Runs; bumper damage recorded", keys: 2, titleStatus: "RECEIVED", documents: "Invoice attached", pendingNotes: "" };
const body = { details, status: "CONFIRMED", expectedVersion: 0, expectedUnitVersion: 1, idempotencyKey: "intake-1", reason: "Record an acquisition intake" };
describe("guided inventory intake", () => {
  it.each([undefined, null, "", "   "])("generates routine action evidence without a typed reason (%s)", reason => {
    expect(normalizeIntake({ ...body, reason }, now).reason).toBe("Confirm acquisition intake.");
    expect(normalizeIntake({ ...body, status: "DRAFT", reason }, now).reason).toBe("Save acquisition intake draft.");
  });
  it("retains attributable notes from existing callers and rejects malformed optional notes", () => {
    expect(normalizeIntake(body, now).reason).toBe(body.reason);
    for (const reason of [123, "short", "x".repeat(1001)]) expect(() => normalizeIntake({ ...body, reason }, now)).toThrow("optional intake note");
  });
  it("confirms screenshot-like pending information without mandatory notes or invented facts", () => {
    const incomplete = { ...details, seller: "", reference: "", titleStatus: "PENDING", documents: "", pendingNotes: "" };
    expect(intakeConfirmationIssue(incomplete)).toBeNull();
    expect(normalizeIntake({ ...body, details: incomplete }, now)).toMatchObject({ status: "CONFIRMED", pendingItems: ["Seller", "Title", "Documents"], details: { pendingNotes: "", documents: "", titleStatus: "PENDING" } });
    const referenced = { ...incomplete, reference: "invoice-1" };
    expect(intakeConfirmationIssue(referenced)).toBeNull();
    expect(intakeConfirmationIssue({ ...referenced, pendingNotes: "Acquisition owner will collect the missing evidence." })).toBeNull();
    expect(normalizeIntake({ ...body, status: "DRAFT", details: incomplete }, now).status).toBe("DRAFT");
  });
  it("confirms a known purchase without an optional invoice reference or extra follow-up", () => {
    const withoutReference = { ...details, reference: "" };
    expect(intakeConfirmationIssue(withoutReference)).toBeNull();
    expect(normalizeIntake({ ...body, details: withoutReference }, now)).toMatchObject({ status: "CONFIRMED", pendingItems: [], details: { reference: "" } });
  });
  it("records a complete handoff without adding implied authorization", () => { expect(normalizeIntake(body, now)).toMatchObject({ status: "CONFIRMED", pendingItems: [], details }); });
  it("saves incomplete drafts without inventing facts", () => { expect(normalizeIntake({ ...body, status: "DRAFT", details: { ...details, seller: "", purchaseCents: null, priceStatus: "PENDING" } }, now).pendingItems).toEqual(["Seller", "Purchase price"]); });
  it("retains a title issue without requiring a follow-up note", () => {
    expect(normalizeIntake({ ...body, details: { ...details, titleStatus: "ISSUE" } }, now)).toMatchObject({ pendingItems: ["Title"], details: { titleStatus: "ISSUE", pendingNotes: "" } });
    expect(normalizeIntake({ ...body, details: { ...details, titleStatus: "ISSUE", pendingNotes: "Owner will reconcile title documents" } }, now).pendingItems).toEqual(["Title"]);
  });
  it.each([{ whereabouts: "" }, { condition: "ok" }])("requires receiving context %j before confirmation", override => { expect(() => normalizeIntake({ ...body, details: { ...details, ...override } }, now)).toThrow(/where the vehicle|arrival condition/); });
  it.each([{ purchaseCents: 0 }, { purchaseCents: 1.5 }, { proposedPriceCents: -1 }, { acquiredOn: "2026-02-30" }, { acquiredOn: "2026-10-08" }, { odometer: -1 }, { keys: 101 }, { priceStatus: "PENDING" }])("rejects invalid intake values %j", override => { expect(() => normalizeIntake({ ...body, details: { ...details, ...override } }, now)).toThrow(); });
  it("does not require a speculative selling price or fixed pack", () => { expect(intakePending({ ...details, proposedPriceCents: null })).toEqual([]); });
});
