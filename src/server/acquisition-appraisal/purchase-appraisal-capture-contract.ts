export const purchaseAppraisalCaptureTypes = [
  "AUCTION_PURCHASE",
  "OUTSIDE_PURCHASE",
  "TRADE_IN",
  "APPRAISAL",
  "WHOLESALE_REVIEW"
] as const;

export type PurchaseAppraisalCaptureType = typeof purchaseAppraisalCaptureTypes[number];

export type PurchaseAppraisalCaptureDraft = {
  askingOrBidCaptured: boolean;
  conditionCaptured: boolean;
  documentProofCaptured: boolean;
  mileageCaptured: boolean;
  sellerSourceCaptured: boolean;
  titleRiskReviewed: boolean;
  type: PurchaseAppraisalCaptureType;
  vinCaptured: boolean;
};

export type PurchaseAppraisalCaptureReview = {
  analysisInputs: string[];
  missingEvidence: string[];
  preserveStoredRecords: true;
  recommendedNextAction: string;
  readyForTaiReview: boolean;
  writeMode: "REVIEW_ONLY";
};

const missingEvidenceLabels: Array<[keyof PurchaseAppraisalCaptureDraft, string]> = [
  ["vinCaptured", "Capture VIN, plate, or stock identity"],
  ["mileageCaptured", "Capture odometer reading"],
  ["conditionCaptured", "Capture exterior, interior, dash, tire, and damage proof"],
  ["sellerSourceCaptured", "Capture seller, auction lane, or appraisal source"],
  ["askingOrBidCaptured", "Capture bid, asking price, trade number, or appraisal target"],
  ["documentProofCaptured", "Attach title, registration, auction sheet, payoff, or disclosure proof"],
  ["titleRiskReviewed", "Review title, lien, disclosure, or ownership risk"]
];

const typeLabels: Record<PurchaseAppraisalCaptureType, string> = {
  APPRAISAL: "customer appraisal",
  AUCTION_PURCHASE: "auction purchase",
  OUTSIDE_PURCHASE: "outside purchase",
  TRADE_IN: "trade-in appraisal",
  WHOLESALE_REVIEW: "wholesale review"
};

export function buildPurchaseAppraisalCaptureReview(draft: PurchaseAppraisalCaptureDraft): PurchaseAppraisalCaptureReview {
  const missingEvidence = missingEvidenceLabels
    .filter(([key]) => !draft[key])
    .map(([, label]) => label);
  const readyForTaiReview = missingEvidence.length === 0;

  return {
    analysisInputs: [
      "vehicle identity",
      "mileage and visible condition",
      "seller/source evidence",
      "document and title risk",
      "bid, asking, trade, or appraisal amount",
      "market fit and margin",
      "recon reserve and missing proof"
    ],
    missingEvidence,
    preserveStoredRecords: true,
    recommendedNextAction: readyForTaiReview
      ? `Send ${typeLabels[draft.type]} packet to TAI review`
      : missingEvidence[0] ?? "Capture missing evidence",
    readyForTaiReview,
    writeMode: "REVIEW_ONLY"
  };
}
