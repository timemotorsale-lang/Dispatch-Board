import { salesConsoleM14DealInventoryDepth } from "./sales-console-m14-deal-inventory-depth";
import { salesConsoleM16ManagerReviewContract } from "./sales-console-m16-manager-review-contract";

export type SalesConsoleM16ManagerReviewDisabledPreview = {
  ctaLabel: string;
  disabledReason: string;
  previewLocation: "Deal Desk" | "Manager Command Center";
  sourcePrompt: string;
};

export const salesConsoleM16ManagerReviewDisabledPreview = {
  ctaLabel: "Request Manager Review",
  disabledReason: "Disabled until source links, manager assignment, reason, urgency, and audit sink are ready.",
  previewLocation: "Deal Desk",
  readOnly: true,
  sourcePrompt: salesConsoleM14DealInventoryDepth.dealOperatingRows[0]?.sourcePrompt ?? "Verify source deal before request preview.",
  unavailableStates: salesConsoleM16ManagerReviewContract.unavailableStates
} as const satisfies SalesConsoleM16ManagerReviewDisabledPreview & {
  readOnly: true;
  unavailableStates: typeof salesConsoleM16ManagerReviewContract.unavailableStates;
};

export function salesConsoleM16ManagerReviewPreviewIsDisabled() {
  return salesConsoleM16ManagerReviewDisabledPreview.readOnly &&
    salesConsoleM16ManagerReviewDisabledPreview.disabledReason.includes("Disabled until");
}

export function salesConsoleM16ManagerReviewPreviewShowsUnavailableStates() {
  return salesConsoleM16ManagerReviewDisabledPreview.unavailableStates.length >= 5;
}

export function salesConsoleM16ManagerReviewPreviewLivesInDealDesk() {
  return salesConsoleM16ManagerReviewDisabledPreview.previewLocation === "Deal Desk" &&
    salesConsoleM16ManagerReviewDisabledPreview.ctaLabel === "Request Manager Review";
}
