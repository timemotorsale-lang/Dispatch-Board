import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryRetailCompletionWorkspace } from "@/features/inventory/inventory-retail-completion-workspace";
import { evaluateAvailableForSale, evaluateUnwind, normalizeDelivery, normalizeDeliveryReadiness, normalizeReconciliation, normalizeReservation, normalizeRetailStart, normalizeSaleDecision, normalizeSaleRequest, normalizeUnwind } from "@/server/inventory-retail-completion/domain";
import { retailCompletionId } from "@/server/inventory-retail-completion/service";

const now = new Date("2026-07-18T15:00:00.000Z");
const base = { expectedVersion: 1, idempotencyKey: "r6-idem", reason: "Reviewed retail completion evidence." };

describe("R6 retail completion domain", () => {
  it("derives one stable retail aggregate identity per InventoryUnit", () => {
    expect(retailCompletionId("org-1", "unit-1")).toBe(retailCompletionId("org-1", "unit-1"));
    expect(retailCompletionId("org-1", "unit-1")).not.toBe(retailCompletionId("org-1", "unit-2"));
  });
  it("requires a future workflow target", () => {
    expect(() => normalizeRetailStart({ ...base, inventoryUnitId: "unit-1", ownerUserId: "owner", policyVersion: "P1", targetAt: "2026-07-18T14:00:00Z" }, now)).toThrow("future");
  });
  it("fails available-for-sale closed without completed R5 and current commercial evidence", () => {
    const failed = evaluateAvailableForSale({ frontline: {}, merchandising: {}, title: {} });
    expect(failed.eligible).toBe(false);
    expect(failed.missing).toEqual(expect.arrayContaining(["FRONTLINE_AUTHORIZATION", "AVAILABILITY_VERIFICATION", "TITLE", "PRICE_MERCHANDISING"]));
    expect(evaluateAvailableForSale({ frontline: { stage: "POST_RELEASE_VERIFICATION", operatingState: "COMPLETED", postReleaseSnapshot: { physicalAvailable: true, internalAvailable: true, digitalAvailable: true } }, merchandising: { frontlineReady: true, priceCents: 100 }, title: { status: "READY" } }).eligible).toBe(true);
  });
  it("requires reservation identity and a future expiry", () => {
    expect(() => normalizeReservation({ ...base, customerReference: "c", dealReference: "d", expiresAt: now.toISOString(), ownerUserId: "owner" }, now)).toThrow("future");
    expect(normalizeReservation({ ...base, customerReference: "c", dealReference: "d", expiresAt: "2026-07-20T15:00:00Z", ownerUserId: "owner" }, now).snapshot.dealReference).toBe("d");
  });
  it("only extends a reservation forward", () => {
    expect(() => normalizeReservation({ ...base, customerReference: "c", dealReference: "d", expiresAt: "2026-07-19T15:00:00Z", ownerUserId: "owner" }, now, new Date("2026-07-20T15:00:00Z"))).toThrow("forward");
  });
  it("requires exact-price sale authority and four-eyes approval", () => {
    const request = normalizeSaleRequest({ ...base, customerReference: "c", dealReference: "d", exactPriceCents: 1_000_000, expiresAt: "2026-07-20T15:00:00Z", paymentReference: "payment-ref", requesterUserId: "requester" }, now).snapshot;
    expect(() => normalizeSaleDecision({ ...base, approved: true, exactPriceCents: 1_000_000 }, request, "requester", now)).toThrow("cannot authorize");
    expect(() => normalizeSaleDecision({ ...base, approved: true, exactPriceCents: 999_999 }, request, "approver", now)).toThrow("must match");
    expect(normalizeSaleDecision({ ...base, approved: true, exactPriceCents: 1_000_000 }, request, "approver", now).snapshot.approverUserId).toBe("approver");
  });
  it("holds delivery readiness on any missing critical evidence", () => {
    const result = normalizeDeliveryReadiness({ ...base, mileage: 10 }, now);
    expect(result.blockers).toEqual(expect.arrayContaining(["DOCUMENTS_INCOMPLETE", "CUSTODY_UNVERIFIED", "PAYMENT_REFERENCE_MISSING", "DELIVERY_READINESS_EVIDENCE_MISSING"]));
  });
  it("requires observed custody handoff evidence and prohibits future delivery", () => {
    expect(() => normalizeDelivery({ ...base, actorUserId: "actor", evidenceObjectIds: [], locationReference: "loc", occurredAt: now.toISOString(), recipientReference: "recipient" }, now)).toThrow("evidence");
    expect(() => normalizeDelivery({ ...base, actorUserId: "actor", evidenceObjectIds: ["e"], locationReference: "loc", occurredAt: "2026-07-19T15:00:00Z", recipientReference: "recipient" }, now)).toThrow("future");
  });
  it("does not treat an external request as delivery reconciliation", () => {
    const delivery = { occurredAt: now.toISOString() };
    expect(() => normalizeReconciliation({ ...base, acknowledged: false, expectedDealReference: "d", externalReference: "r", externalSystemCode: "DMS", returnedDealReference: "d" }, delivery, now)).toThrow("request alone");
    expect(() => normalizeReconciliation({ ...base, acknowledged: true, expectedDealReference: "d", externalReference: "r", externalSystemCode: "DMS", returnedDealReference: "other" }, delivery, now)).toThrow("does not match");
  });
  it("requires compensated unwind evidence and independent approval", () => {
    const unwind = normalizeUnwind({ ...base, custodyReturned: true, evidenceObjectIds: ["e"], financialEffectReference: "f", inventoryReentryRoute: "FRONTLINE_REVALIDATION", requesterUserId: "requester", returnedConditionAccepted: true, titleEffectReference: "t" }, now).snapshot;
    expect(() => evaluateUnwind(unwind, "requester", now)).toThrow("cannot approve");
    expect(evaluateUnwind(unwind, "approver", now).eligible).toBe(true);
  });
  it("renders the enterprise workspace and truthful adapter boundary", () => {
    const markup = renderToStaticMarkup(<InventoryRetailCompletionWorkspace initial={{ contractVersion:"inv-retail/1.0.0",freshness:"COMPLETE",generatedAt:now.toISOString(),items:[],totals:{available:0,reserved:0,delivery:0,reconciliation:0} }} options={{units:[],users:[]}}/>);
    expect(markup).toContain("Finish every retail sale with evidence");
    expect(markup).toContain("CRM, DMS, payment, title, and accounting adapters remain disabled");
    expect(markup).toContain("Start from verified frontline inventory");
  });
});
