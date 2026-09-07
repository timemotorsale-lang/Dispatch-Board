import { describe, expect, it } from "vitest";

import {
  buildGrowthReleaseReadinessReviewModel,
  evaluateGrowthReleaseReadiness
} from "@/server/growth/release-readiness";

describe("growth release readiness", () => {
  it("is ready for review when everything is complete except user adoption approval", () => {
    const readiness = evaluateGrowthReleaseReadiness({
      adSpendLocked: true,
      backendExpansionDeferred: true,
      frontendReviewReady: true,
      liveSendLocked: true,
      recordPreservationConfirmed: true,
      sourceDocsUpdated: true,
      userApprovedAdoption: false
    });

    expect(readiness.adoptionStatus).toBe("Ready for user review");
    expect(readiness.nextAction).toBe("Review this implementation before approving adoption");
  });

  it("does not pass review when record preservation is not confirmed", () => {
    const readiness = evaluateGrowthReleaseReadiness({
      adSpendLocked: true,
      backendExpansionDeferred: true,
      frontendReviewReady: true,
      liveSendLocked: true,
      recordPreservationConfirmed: false,
      sourceDocsUpdated: true,
      userApprovedAdoption: false
    });

    expect(readiness.adoptionStatus).toBe("Not ready");
    expect(readiness.nextAction).toContain("Existing estimates, quotes, invoices");
  });

  it("marks adoption approved only after explicit approval", () => {
    const readiness = evaluateGrowthReleaseReadiness({
      adSpendLocked: true,
      backendExpansionDeferred: true,
      frontendReviewReady: true,
      liveSendLocked: true,
      recordPreservationConfirmed: true,
      sourceDocsUpdated: true,
      userApprovedAdoption: true
    });

    expect(readiness.adoptionStatus).toBe("Adoption approved");
  });

  it("builds the default review model with live actions locked", () => {
    const model = buildGrowthReleaseReadinessReviewModel();

    expect(model.adoptionStatus).toBe("Ready for user review");
    expect(model.summary).toContain("Live sending");
    expect(model.items.find((item) => item.id === "userApproval")?.passed).toBe(false);
  });
});
