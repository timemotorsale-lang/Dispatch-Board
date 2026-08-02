import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AcquisitionAppraisalWorkspace } from "@/features/inventory/acquisition-appraisal-workspace";
import { normalizeAcquisitionCaseCreate, normalizeAppraisalCommand, normalizeAuthorizationDecision, normalizeAuthorizationRequest, normalizeEvidenceCommand, normalizeFinancialAcquisition, normalizeOfferCommand, normalizeProposalCommand } from "@/server/acquisition-appraisal/domain";
import { acquisitionCaseIdForIdempotency } from "@/server/acquisition-appraisal/service";

const now = new Date("2026-07-18T15:00:00.000Z");
const base = { expectedVersion: 1, idempotencyKey: "idem-1", reason: "Reviewed acquisition case evidence." };
const evidence = { ...base, conditionEvidence: .8, evidenceObjectIds: ["evidence-1"], historyTitleEvidence: .8, identityConflict: false, mileage: 42000, mileageVerified: true, observedAt: now, sellerAuthorityVerified: true, titleHistoryConflict: false, trimCertainty: .9, vinDecodeQuality: .9 };
const appraisal = { ...base, comparableCount: 4, comparableRecency: .8, comparables: [], conditionEvidence: .8, estimatedFeesCents: 50_000, estimatedReconCents: 150_000, evidenceObjectIds: ["evidence-1"], expectedRetailCents: 2_000_000, expiresAt: "2026-07-20T15:00:00.000Z", historyTitleEvidence: .8, mileageVerified: true, reconEstimateQuality: .8, trimCertainty: .9, vinDecodeQuality: .9 };

describe("R4 acquisition and appraisal domain", () => {
  it("derives a stable aggregate identity for idempotent opportunity retries", () => {
    expect(acquisitionCaseIdForIdempotency("org-1", "retry-key")).toBe(acquisitionCaseIdForIdempotency("org-1", "retry-key"));
    expect(acquisitionCaseIdForIdempotency("org-1", "retry-key")).not.toBe(acquisitionCaseIdForIdempotency("org-1", "other-key"));
  });
  it("creates only a pre-control opportunity with a future expiry", () => {
    const result = normalizeAcquisitionCaseCreate({ ...base, acquisitionType: "PURCHASE", expiresAt: "2026-07-25T15:00:00.000Z", intendedUse: "RETAIL", locationId: "loc-1", ownerUserId: "user-1", source: "AUCTION", sourceReference: "A-100", vehicleId: "vehicle-1" }, now);
    expect(result).toMatchObject({ acquisitionType: "PURCHASE", vehicleId: "vehicle-1" });
    expect(() => normalizeAcquisitionCaseCreate({ ...result, expiresAt: "2026-07-17T15:00:00.000Z" }, now)).toThrow("expiry must be in the future");
  });

  it("fails evidence qualification closed on identity, authority, mileage, and source evidence", () => {
    const result = normalizeEvidenceCommand({ ...evidence, evidenceObjectIds: [], identityConflict: true, mileageVerified: false, sellerAuthorityVerified: false });
    expect(result.status).toBe("INSUFFICIENT");
    expect(result.blockers).toEqual(expect.arrayContaining(["IDENTITY_CONFLICT", "SELLER_AUTHORITY_UNVERIFIED", "MILEAGE_UNVERIFIED", "EVIDENCE_MISSING"]));
    expect(normalizeEvidenceCommand(evidence).status).toBe("READY_FOR_APPRAISAL");
  });

  it("versions appraisal evidence and prohibits a bid recommendation when confidence is insufficient", () => {
    const insufficient = normalizeAppraisalCommand({ ...appraisal, comparableCount: 0, historyTitleEvidence: .1, mileageVerified: false, vinDecodeQuality: .1 }, now);
    expect(insufficient.status).toBe("INSUFFICIENT");
    const qualified = normalizeAppraisalCommand(appraisal, now);
    expect(qualified.status).toBe("APPRAISAL_REVIEW");
    expect(qualified.snapshot.confidence).toMatch(/HIGH|MEDIUM/);
  });

  it("calculates an advisory maximum and applies the hard policy ceiling", () => {
    const appraisalResult = normalizeAppraisalCommand(appraisal, now);
    const result = normalizeProposalCommand({ ...base, acquisitionFeesCents: 50_000, expectedHoldingCostCents: 50_000, otherAcquisitionCostsCents: 0, policyCeilingCents: 1_200_000, riskReserveCents: 75_000, sellingCostsCents: 50_000, targetGrossCents: 250_000, titleAndMerchandisingCostsCents: 25_000, transportCostCents: 50_000 }, appraisalResult.snapshot, now);
    expect(result.eligible).toBe(true);
    expect(result.snapshot.recommendedMaximumBidCents).toBeLessThanOrEqual(1_200_000);
    expect(result.snapshot.humanDecisionRequired).toBe(true);
  });

  it("rejects proposals above the governed maximum and expired authorization requests", () => {
    const recommendation = { algorithmVersion: "maximum-bid/1.0.0", recommendedMaximumBidCents: 1_000_000 };
    expect(() => normalizeAuthorizationRequest({ ...base, appraisalVersion: 1, conflictDisclosure: "None", expiresAt: "2026-07-20T15:00:00.000Z", policyVersion: "P1", proposedAmountCents: 1_000_001, requesterUserId: "user-1" }, recommendation, now)).toThrow("exceeds");
    expect(() => normalizeAuthorizationRequest({ ...base, appraisalVersion: 1, conflictDisclosure: "None", expiresAt: "2026-07-17T15:00:00.000Z", policyVersion: "P1", proposedAmountCents: 900_000, requesterUserId: "user-1" }, recommendation, now)).toThrow("future");
  });

  it("enforces four-eyes authorization", () => {
    const authorization = { expiresAt: "2026-07-20T15:00:00.000Z", proposedAmountCents: 900_000, requesterUserId: "requester" };
    expect(() => normalizeAuthorizationDecision({ ...base, disposition: "APPROVED" }, authorization, "requester", now)).toThrow("cannot approve");
    expect(normalizeAuthorizationDecision({ ...base, disposition: "APPROVED" }, authorization, "approver", now).disposition).toBe("APPROVED");
  });

  it("requires exact approved amount and acceptance evidence for a commitment", () => {
    const authorization = { disposition: "APPROVED", proposedAmountCents: 900_000 };
    expect(() => normalizeOfferCommand({ ...base, accepted: false, amountCents: 900_001, offerVersion: 1, terms: "Standard" }, authorization, now)).toThrow("exceeds");
    expect(() => normalizeOfferCommand({ ...base, accepted: true, amountCents: 900_000, offerVersion: 1, terms: "Standard" }, authorization, now)).toThrow("evidence reference");
    expect(normalizeOfferCommand({ ...base, acceptanceEvidenceReference: "signed-1", accepted: true, amountCents: 900_000, offerVersion: 1, terms: "Standard" }, authorization, now).accepted).toBe(true);
  });

  it("prevents inventory creation without accepted evidence or with a future control time", () => {
    const input = { ...base, effectiveAt: now, inventoryNumber: "INV-1", nextAction: "Plan transport", ownerUserId: "owner", targetAt: "2026-07-20T15:00:00.000Z" };
    expect(() => normalizeFinancialAcquisition(input, {}, now)).toThrow("Accepted commitment evidence");
    expect(() => normalizeFinancialAcquisition({ ...input, effectiveAt: "2026-07-19T15:00:00.000Z" }, { accepted: true, acceptanceEvidenceReference: "signed-1" }, now)).toThrow("cannot be in the future");
  });
});

describe("R4 Acquisition & Appraisal workspace", () => {
  it("renders the decision boundary, pipeline, approval, and disabled adapter truth", () => {
    const item = { acquisitionType: "PURCHASE", appraisalSnapshot: { confidence: "HIGH" }, authorizationSnapshot: { proposedAmountCents: 900_000 }, commitmentSnapshot: {}, evidenceSnapshot: {}, events: [], expiresAt: "2026-07-25T15:00:00.000Z", id: "case-1", intendedUse: "RETAIL", inventoryUnit: null, location: { id: "loc-1", name: "North" }, offerSnapshot: {}, ownerUser: { id: "owner", name: "Avery" }, recommendationSnapshot: { recommendedMaximumBidCents: 1_000_000 }, source: "AUCTION", sourceReference: "A-100", status: "PROPOSAL_READY", vehicle: { id: "vehicle-1", make: "Toyota", model: "Camry", vehicleNumber: "V-1", vin: "VIN1", year: 2021 }, version: 4 };
    const markup = renderToStaticMarkup(<AcquisitionAppraisalWorkspace initial={{ contractVersion: "r4.1", freshness: "COMPLETE", generatedAt: now.toISOString(), items: [item], totals: { active: 1, authorizationPending: 0, evidenceRequired: 0, readyForAppraisal: 0 } }} options={{ locations: [{ id: "loc-1", name: "North" }], users: [{ id: "owner", name: "Avery" }], vehicles: [{ id: "vehicle-1", vehicleNumber: "V-1" }] }} />);
    expect(markup).toContain("Decide before inventory begins.");
    expect(markup).toContain("Acquisition &amp; Appraisal Command Center");
    expect(markup).toContain("Governed acquisition stages");
    expect(markup).toContain("Decision readiness");
    expect(markup).toContain("Control boundary");
    expect(markup).toContain("does not create inventory, ownership, a bid, or a commitment");
    expect(markup).toContain("Request exact-version authorization");
    expect(markup).toContain("External bidding, payment, accounting, and transport adapters are disabled.");
  });
});
