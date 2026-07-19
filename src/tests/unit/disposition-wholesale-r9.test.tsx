import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DispositionWholesaleWorkspace } from "@/features/inventory/disposition-wholesale-workspace";
import { assertIndependentDispositionDecision, calculateDispositionRecommendation, normalizeActivation, normalizeBelowReserveOfferApproval, normalizeCandidateReview, normalizeChannelProposal, normalizeCompletion, normalizeDispositionAppraisal, normalizeOffer, normalizeOfferDecision, normalizeProposalDecision, normalizeSettlement } from "@/server/disposition-wholesale/domain";

const base = { expectedCaseVersion: 1, idempotencyKey: "r9-command", occurredAt: "2026-07-18T15:00:00.000Z", reason: "Record governed disposition evidence and decision." };

describe("R9 Disposition & Wholesale", () => {
  it("ranks eligible candidates but remains advisory", () => {
    expect(calculateDispositionRecommendation({ ageDays: 65, blocked: false, costExposureCents: 2_000_000, titleReady: true })).toMatchObject({ eligible: true, recommendation: "REVIEW_DISPOSITION", execution: "ADVISORY_NON_EXECUTING" });
    expect(calculateDispositionRecommendation({ ageDays: 10, blocked: false, costExposureCents: 100_000, titleReady: true }).eligible).toBe(false);
  });
  it("requires attributable accept, dismiss, defer, or reopen review", () => {
    expect(normalizeCandidateReview({ ...base, disposition: "ACCEPT" }).disposition).toBe("ACCEPT");
    expect(() => normalizeCandidateReview({ ...base, disposition: "DEFER" })).toThrow("follow-up");
  });
  it("requires evidence, comparable lineage, range, confidence, and expiry for appraisal", () => {
    expect(() => normalizeDispositionAppraisal({ ...base, lowCents: 10, highCents: 9, confidence: "HIGH", evidence: ["e"], comparables: [{ id: "c" }], expiresAt: "2026-08-01T15:00:00Z" })).toThrow("cannot exceed");
    expect(() => normalizeDispositionAppraisal({ ...base, lowCents: 9, highCents: 10, confidence: "HIGH", evidence: [], comparables: [], expiresAt: "2026-08-01T15:00:00Z" })).toThrow("requires evidence");
  });
  it("fails a channel proposal below the governed gross floor", () => {
    expect(() => normalizeChannelProposal({ ...base, appraisalVersion: 1, channel: "WHOLESALE", askingCents: 10_000, reserveCents: 8_000, estimatedFeesCents: 1_000, grossFloorCents: 7_500, estimatedDays: 5, policyVersion: "P1", risk: "MEDIUM" })).toThrow("gross floor");
  });
  it("requires exact proposal identity and an independent approver", () => {
    expect(normalizeProposalDecision({ ...base, amountCents: 10_000, decision: "APPROVED", policyVersion: "P1", proposalVersion: 2 }).proposalVersion).toBe(2);
    expect(() => assertIndependentDispositionDecision("requester", "requester")).toThrow("different authorized user");
  });
  it("does not call activation complete without acknowledgement identity", () => {
    expect(() => normalizeActivation({ ...base, mode: "CONNECTOR", status: "ACTIVE", proposalVersion: 1 })).toThrow("acknowledgement");
    expect(normalizeActivation({ ...base, mode: "MANUAL", status: "ACTIVE", proposalVersion: 1, externalReference: "manual-evidence" }).status).toBe("ACTIVE");
  });
  it("keeps offer versions sourced, net-normalized, and expiry-bound", () => {
    expect(normalizeOffer({ ...base, amountCents: 10_000, feesCents: 500, expiresAt: "2026-07-20T15:00:00Z", externalOfferId: "offer-1", source: "auction", terms: [] }).netCents).toBe(9_500);
    expect(() => normalizeOfferDecision({ ...base, decision: "UNKNOWN", offerVersion: 1 })).toThrow("invalid");
    expect(normalizeBelowReserveOfferApproval({ ...base, amountCents: 9_000, decision: "APPROVED", offerVersion: 1, policyVersion: "P1" })).toMatchObject({ amountCents: 9_000, offerVersion: 1, policyVersion: "P1" });
  });
  it("fails sale or transfer completion closed on any release gate", () => {
    expect(() => normalizeCompletion({ ...base, type: "SALE", buyerOrDestination: "buyer", paymentReference: "payment", titleReady: true, releaseReady: true, custodyVerified: true, transportVerified: false, receiptVerified: true })).toThrow("transportVerified");
  });
  it("requires acknowledged settlement and distinguishes a mismatch", () => {
    expect(() => normalizeSettlement({ ...base, expectedProceedsCents: 10_000, actualProceedsCents: 9_000, feesCents: 0, creditsCents: 0, toleranceCents: 0, externalStatus: "SUBMITTED", externalReference: "x" })).toThrow("acknowledgement");
    expect(normalizeSettlement({ ...base, expectedProceedsCents: 10_000, actualProceedsCents: 9_000, feesCents: 0, creditsCents: 0, toleranceCents: 0, externalStatus: "ACKNOWLEDGED", externalReference: "x" })).toMatchObject({ matched: false, varianceCents: -1_000 });
  });
  it("renders seven local destinations, eight milestones, and truthful provider states", () => {
    const markup = renderToStaticMarkup(<DispositionWholesaleWorkspace initial={{ capability: { activationAdapters: "DISABLED_MANUAL_SANDBOX_ONLY", recommendations: "ADVISORY_NON_EXECUTING", settlementAdapters: "DISABLED" }, contractVersion: "disposition-wholesale/r9.0.0", generatedAt: "2026-07-18T15:00:00.000Z", freshness: "COMPLETE", totals: { approvals: 0, candidates: 0, exceptions: 0, expectedRecoveryCents: 0, openCases: 0 }, pipeline: ["CANDIDATE_REVIEW", "APPRAISAL", "CHANNEL_PRICING", "APPROVAL", "ACTIVATION", "OFFERS_BIDS", "SALE_TRANSFER", "SETTLEMENT"].map(stage => ({ stage, count: 0 })), candidates: [], cases: [], users: [], locations: [] }} />);
    expect(markup).toContain("Disposition &amp; Wholesale");
    expect(markup).toContain("Candidates");
    expect(markup).toContain("Channels &amp; Listings");
    expect(markup).toContain("Settled &amp; Reconciled");
    expect(markup).toContain("DISABLED_MANUAL_SANDBOX_ONLY");
    expect(markup).toContain("Recommendations rank eligible records and never execute");
    expect(markup).toContain("Recommendation Workbench");
    expect(markup).toContain("Recommendation work categories");
    expect(markup).toContain("Stock #");
    expect(markup).toContain("Rationale Summary");
    expect(markup).toContain("Reviews &amp; Approvals");
    expect(markup).toContain("Disposition review and approval categories");
    expect(markup).toContain("Channel Performance");
    expect(markup).toContain("Decision Explanation");
  });
  it("defines the authoritative aggregate and source-controlled migration", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8"), migration = readFileSync("prisma/migrations/20260718190000_inventory_console_r9_disposition_wholesale/migration.sql", "utf8");
    for (const token of ["model InventoryDispositionCase", "model InventoryDispositionCaseEvent", "appraisalVersions", "proposalVersions", "offerVersions", "settlementSnapshot"]) expect(schema).toContain(token);
    expect(migration).toContain('CREATE TABLE "InventoryDispositionCase"');
    expect(migration).toContain('CREATE UNIQUE INDEX "InventoryDispositionCaseEvent_dispositionCaseId_version_key"');
  });
});
