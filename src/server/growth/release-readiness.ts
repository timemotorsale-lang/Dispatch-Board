export type GrowthReleaseReadinessItemId =
  | "frontend"
  | "sourceDocs"
  | "recordPreservation"
  | "liveSendLock"
  | "adSpendLock"
  | "backendExpansion"
  | "userApproval";

export type GrowthReleaseReadinessItem = {
  id: GrowthReleaseReadinessItemId;
  label: string;
  passed: boolean;
  summary: string;
};

export type GrowthReleaseReadinessInput = {
  adSpendLocked: boolean;
  backendExpansionDeferred: boolean;
  frontendReviewReady: boolean;
  liveSendLocked: boolean;
  recordPreservationConfirmed: boolean;
  sourceDocsUpdated: boolean;
  userApprovedAdoption: boolean;
};

export type GrowthReleaseReadinessModel = {
  adoptionStatus: "Ready for user review" | "Adoption approved" | "Not ready";
  items: GrowthReleaseReadinessItem[];
  nextAction: string;
  summary: string;
};

export function evaluateGrowthReleaseReadiness(input: GrowthReleaseReadinessInput): GrowthReleaseReadinessModel {
  const items: GrowthReleaseReadinessItem[] = [
    {
      id: "sourceDocs",
      label: "Source-of-truth documents updated",
      passed: input.sourceDocsUpdated,
      summary: "Architecture, roadmap, milestones, workflows, automations, and logic guide the build."
    },
    {
      id: "frontend",
      label: "Frontend review shell complete",
      passed: input.frontendReviewReady,
      summary: "The daily path is visible, simple, and ready for user review."
    },
    {
      id: "recordPreservation",
      label: "Stored records preserved",
      passed: input.recordPreservationConfirmed,
      summary: "Existing estimates, quotes, invoices, customer records, and inventory records remain untouched."
    },
    {
      id: "liveSendLock",
      label: "Customer sends locked",
      passed: input.liveSendLocked,
      summary: "No customer email, text, call task automation, or provider send can run from this frontend pass."
    },
    {
      id: "adSpendLock",
      label: "Ad spend locked",
      passed: input.adSpendLocked,
      summary: "Paid campaigns remain disabled until budget, inventory, creative, provider, and owner approvals exist."
    },
    {
      id: "backendExpansion",
      label: "Backend expansion deferred",
      passed: input.backendExpansionDeferred,
      summary: "The next backend build starts only after the frontend workflow is reviewed and approved."
    },
    {
      id: "userApproval",
      label: "User adoption approval",
      passed: input.userApprovedAdoption,
      summary: "The implementation becomes the adopted Growth Console only after explicit user approval."
    }
  ];

  const failed = items.find((item) => !item.passed);
  const readyExceptApproval = items.every((item) => item.passed || item.id === "userApproval");

  if (items.every((item) => item.passed)) {
    return {
      adoptionStatus: "Adoption approved",
      items,
      nextAction: "Begin the approved backend sequence",
      summary: "The Growth Console has passed review and adoption approval."
    };
  }

  if (readyExceptApproval) {
    return {
      adoptionStatus: "Ready for user review",
      items,
      nextAction: "Review this implementation before approving adoption",
      summary: "The frontend is review-ready. Live sending, ad spend, and backend expansion remain locked."
    };
  }

  return {
    adoptionStatus: "Not ready",
    items,
    nextAction: failed?.summary ?? "Complete release readiness checks",
    summary: "The Growth Console needs one or more readiness checks before adoption review."
  };
}

export function buildGrowthReleaseReadinessReviewModel(): GrowthReleaseReadinessModel {
  return evaluateGrowthReleaseReadiness({
    adSpendLocked: true,
    backendExpansionDeferred: true,
    frontendReviewReady: true,
    liveSendLocked: true,
    recordPreservationConfirmed: true,
    sourceDocsUpdated: true,
    userApprovedAdoption: false
  });
}
