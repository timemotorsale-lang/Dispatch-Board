import {
  salesConsoleRevenueLaneNames,
  type SalesConsoleRevenueLaneName
} from "./sales-console-operational-domain";

export type SalesCompletionRequirementCode =
  | "customer-linked"
  | "revenue-lane-selected"
  | "source-links-present"
  | "salesperson-linked"
  | "sale-date-present"
  | "vehicle-linked"
  | "inventory-verified"
  | "gross-estimate-present"
  | "cash-payment-path-labeled"
  | "bhph-proof-checklist"
  | "down-payment-intent"
  | "finance-handoff-labeled"
  | "lto-eligibility-checklist"
  | "payment-terms-reviewed"
  | "repair-estimate-source"
  | "repair-authorization-status"
  | "rental-window"
  | "rental-availability"
  | "warranty-eligibility"
  | "warranty-authorization"
  | "finance-product-menu"
  | "lender-or-source-status"
  | "manager-review-resolved"
  | "evidence-attached"
  | "source-verification-ready";

export type SalesCompletionRequirement = {
  code: SalesCompletionRequirementCode;
  label: string;
  sourceOwner: string;
  evidenceRequired: boolean;
  managerReviewTrigger?: boolean;
};

export type SalesCompletionInput = {
  lane: SalesConsoleRevenueLaneName;
  satisfied: SalesCompletionRequirementCode[];
  blockerSeverity: "none" | "watch" | "risk" | "blocked";
  evidenceIds: string[];
  sourceLinks: string[];
  managerReviewResolved: boolean;
};

export type SalesCompletionDecision = {
  lane: SalesConsoleRevenueLaneName;
  readinessScore: number;
  canRecordCompletedSale: boolean;
  missingRequirements: SalesCompletionRequirement[];
  evidenceRequired: SalesCompletionRequirement[];
  managerReviewRequired: boolean;
  sourceVerificationRequired: boolean;
  governedActions: string[];
};

const commonRequirements: SalesCompletionRequirement[] = [
  { code: "customer-linked", label: "Customer is linked", sourceOwner: "CRM / Customers", evidenceRequired: false },
  { code: "revenue-lane-selected", label: "Revenue lane is selected", sourceOwner: "Sales Console Internal", evidenceRequired: false },
  { code: "source-links-present", label: "Source links are present", sourceOwner: "Sales Console Internal", evidenceRequired: false },
  { code: "salesperson-linked", label: "Salesperson is linked", sourceOwner: "Sales Console Internal", evidenceRequired: false },
  { code: "sale-date-present", label: "Sale date is present", sourceOwner: "Sales Console Internal", evidenceRequired: false },
  { code: "source-verification-ready", label: "Source verification is ready", sourceOwner: "Sales Console Internal", evidenceRequired: false }
];

export const salesCompletionRulesByLane: Record<SalesConsoleRevenueLaneName, SalesCompletionRequirement[]> = {
  "Inventory Cash Sale": [
    ...commonRequirements,
    { code: "vehicle-linked", label: "Vehicle is linked", sourceOwner: "Inventory / Vehicles", evidenceRequired: false },
    { code: "inventory-verified", label: "Inventory status is verified", sourceOwner: "Inventory / Vehicles", evidenceRequired: false },
    { code: "gross-estimate-present", label: "Gross estimate is present", sourceOwner: "Sales Console Internal", evidenceRequired: false },
    { code: "cash-payment-path-labeled", label: "Cash payment path is labeled", sourceOwner: "DMS", evidenceRequired: false },
    { code: "evidence-attached", label: "Sale evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Inventory BHPH Sale": [
    ...commonRequirements,
    { code: "vehicle-linked", label: "Vehicle is linked", sourceOwner: "Inventory / Vehicles", evidenceRequired: false },
    { code: "bhph-proof-checklist", label: "BHPH proof checklist is complete", sourceOwner: "Finance", evidenceRequired: true, managerReviewTrigger: true },
    { code: "down-payment-intent", label: "Down payment intent is recorded", sourceOwner: "Finance", evidenceRequired: true, managerReviewTrigger: true },
    { code: "finance-handoff-labeled", label: "Finance handoff status is labeled", sourceOwner: "Finance", evidenceRequired: false },
    { code: "manager-review-resolved", label: "Manager review is resolved", sourceOwner: "Sales Manager", evidenceRequired: false, managerReviewTrigger: true },
    { code: "evidence-attached", label: "Compliance evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Inventory Lease-to-Own": [
    ...commonRequirements,
    { code: "vehicle-linked", label: "Vehicle is linked", sourceOwner: "Inventory / Vehicles", evidenceRequired: false },
    { code: "lto-eligibility-checklist", label: "LTO eligibility checklist is complete", sourceOwner: "Finance", evidenceRequired: true, managerReviewTrigger: true },
    { code: "payment-terms-reviewed", label: "Payment terms are reviewed", sourceOwner: "Finance", evidenceRequired: true, managerReviewTrigger: true },
    { code: "manager-review-resolved", label: "Manager review is resolved", sourceOwner: "Sales Manager", evidenceRequired: false, managerReviewTrigger: true },
    { code: "evidence-attached", label: "LTO evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Public Auto Repair": [
    ...commonRequirements,
    { code: "repair-estimate-source", label: "Repair estimate source is linked", sourceOwner: "Service / Repair", evidenceRequired: false },
    { code: "repair-authorization-status", label: "Repair authorization status is labeled", sourceOwner: "Service / Repair", evidenceRequired: false },
    { code: "evidence-attached", label: "Repair sale evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Daily Rental": [
    ...commonRequirements,
    { code: "rental-window", label: "Rental window is recorded", sourceOwner: "Rental", evidenceRequired: false },
    { code: "rental-availability", label: "Rental availability is verified", sourceOwner: "Rental", evidenceRequired: false },
    { code: "evidence-attached", label: "Rental evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Warranty Product": [
    ...commonRequirements,
    { code: "warranty-eligibility", label: "Warranty eligibility is verified", sourceOwner: "Warranty", evidenceRequired: true, managerReviewTrigger: true },
    { code: "warranty-authorization", label: "Warranty authorization status is labeled", sourceOwner: "Warranty", evidenceRequired: true, managerReviewTrigger: true },
    { code: "manager-review-resolved", label: "Manager review is resolved", sourceOwner: "Sales Manager", evidenceRequired: false, managerReviewTrigger: true },
    { code: "evidence-attached", label: "Warranty evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ],
  "Financing Product": [
    ...commonRequirements,
    { code: "finance-product-menu", label: "Finance product menu is reviewed", sourceOwner: "Finance", evidenceRequired: true, managerReviewTrigger: true },
    { code: "lender-or-source-status", label: "Lender/source status is labeled", sourceOwner: "Finance", evidenceRequired: false },
    { code: "manager-review-resolved", label: "Manager review is resolved", sourceOwner: "Sales Manager", evidenceRequired: false, managerReviewTrigger: true },
    { code: "evidence-attached", label: "Finance product evidence is attached", sourceOwner: "Sales Console Internal", evidenceRequired: true }
  ]
};

export const salesCompletionGovernedActions = [
  "quote submission",
  "discount approval",
  "finance decision",
  "vehicle hold/reservation",
  "customer messaging",
  "contract execution"
] as const;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateSalesCompletionReadiness(input: SalesCompletionInput): SalesCompletionDecision {
  const rules = salesCompletionRulesByLane[input.lane];
  const satisfied = new Set(input.satisfied);
  const missingRequirements = rules.filter((rule) => !satisfied.has(rule.code));
  const evidenceRequired = rules.filter((rule) => rule.evidenceRequired);
  const missingEvidence = evidenceRequired.length > 0 && input.evidenceIds.length === 0;
  const missingSourceLinks = input.sourceLinks.length === 0 || !satisfied.has("source-links-present");
  const managerReviewRequired =
    input.blockerSeverity === "blocked" ||
    rules.some((rule) => rule.managerReviewTrigger) ||
    missingRequirements.some((rule) => rule.managerReviewTrigger);
  const sourceVerificationRequired = missingSourceLinks || !satisfied.has("source-verification-ready");
  const baseScore = (satisfied.size / rules.length) * 100;
  const penalty =
    (missingEvidence ? 18 : 0) +
    (sourceVerificationRequired ? 14 : 0) +
    (managerReviewRequired && !input.managerReviewResolved ? 16 : 0) +
    (input.blockerSeverity === "blocked" ? 20 : input.blockerSeverity === "risk" ? 10 : input.blockerSeverity === "watch" ? 5 : 0);
  const readinessScore = clampScore(baseScore - penalty);
  const canRecordCompletedSale =
    missingRequirements.length === 0 &&
    !missingEvidence &&
    !sourceVerificationRequired &&
    (!managerReviewRequired || input.managerReviewResolved) &&
    input.blockerSeverity !== "blocked";

  return {
    lane: input.lane,
    readinessScore,
    canRecordCompletedSale,
    missingRequirements,
    evidenceRequired,
    managerReviewRequired,
    sourceVerificationRequired,
    governedActions: [...salesCompletionGovernedActions]
  };
}

export function salesCompletionRulesCoverEveryRevenueLane() {
  return salesConsoleRevenueLaneNames.every((lane) => salesCompletionRulesByLane[lane].length > commonRequirements.length);
}

export function salesCompletionRulesKeepRiskyActionsGoverned() {
  return salesCompletionGovernedActions.length >= 6;
}
