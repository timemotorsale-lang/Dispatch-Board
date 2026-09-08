import { describe, expect, it } from "vitest";

import { buildPurchaseAppraisalCaptureReview } from "@/server/acquisition-appraisal/purchase-appraisal-capture-contract";

describe("purchase appraisal capture contract", () => {
  it("keeps purchase and appraisal capture review-only while evidence is incomplete", () => {
    const review = buildPurchaseAppraisalCaptureReview({
      askingOrBidCaptured: false,
      conditionCaptured: true,
      documentProofCaptured: false,
      mileageCaptured: true,
      sellerSourceCaptured: false,
      titleRiskReviewed: false,
      type: "TRADE_IN",
      vinCaptured: true
    });

    expect(review.writeMode).toBe("REVIEW_ONLY");
    expect(review.preserveStoredRecords).toBe(true);
    expect(review.readyForTaiReview).toBe(false);
    expect(review.missingEvidence).toContain("Capture seller, auction lane, or appraisal source");
    expect(review.recommendedNextAction).toBe("Capture seller, auction lane, or appraisal source");
  });

  it("marks a complete capture packet ready for TAI review", () => {
    const review = buildPurchaseAppraisalCaptureReview({
      askingOrBidCaptured: true,
      conditionCaptured: true,
      documentProofCaptured: true,
      mileageCaptured: true,
      sellerSourceCaptured: true,
      titleRiskReviewed: true,
      type: "AUCTION_PURCHASE",
      vinCaptured: true
    });

    expect(review.readyForTaiReview).toBe(true);
    expect(review.missingEvidence).toEqual([]);
    expect(review.recommendedNextAction).toBe("Send auction purchase packet to TAI review");
    expect(review.analysisInputs).toContain("recon reserve and missing proof");
  });
});
