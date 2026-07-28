import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";

export type SalesConsoleM14DealOperatingRow = {
  blocker: string;
  customer: string;
  dealId: string;
  managerReviewNeed: string;
  readOnlyAction: string;
  sourcePrompt: string;
};

export type SalesConsoleM14InventoryOperatingRow = {
  blockedLabel: string;
  matchedCustomer: string;
  readOnlyAction: string;
  readiness: string;
  sourcePrompt: string;
  stock: string;
  vehicle: string;
};

export const salesConsoleM14DealInventoryDepth = {
  dealOperatingRows: salesConsoleReadAdapterPreview.deals.map((deal): SalesConsoleM14DealOperatingRow => ({
    blocker: deal.blockerState,
    customer: deal.customer,
    dealId: deal.dealId,
    managerReviewNeed: deal.approval.includes("Pending")
      ? "Manager review needed in source workflow"
      : deal.freshnessState === "placeholder"
        ? "Verify scenario before trusting deal desk"
        : "No manager action from console",
    readOnlyAction: "Review only; do not submit quotes, approve discounts, or make finance decisions here.",
    sourcePrompt: deal.freshnessState === "placeholder"
      ? "Open source deal record before discussing scenario or payment."
      : "Verify source deal and customer records before customer-facing action."
  })),
  inventoryOperatingRows: salesConsoleReadAdapterPreview.inventoryMatches.map((vehicle): SalesConsoleM14InventoryOperatingRow => ({
    blockedLabel: vehicle.blockerDetail,
    matchedCustomer: vehicle.matchCustomer,
    readOnlyAction: "Review only; do not hold, reserve, or promise availability from this console.",
    readiness: vehicle.status,
    sourcePrompt: vehicle.freshnessState === "verify-first"
      ? "Verify inventory source and recon/availability before presenting."
      : "Confirm vehicle source record before presentation.",
    stock: vehicle.stock,
    vehicle: vehicle.vehicle
  })),
  readOnly: true
} as const;

export function salesConsoleM14DealDeskHasOperatingRows() {
  return salesConsoleM14DealInventoryDepth.dealOperatingRows.length > 0 &&
    salesConsoleM14DealInventoryDepth.dealOperatingRows.every((deal) => deal.readOnlyAction.includes("do not submit quotes"));
}

export function salesConsoleM14InventoryHasReadinessRows() {
  return salesConsoleM14DealInventoryDepth.inventoryOperatingRows.length > 0 &&
    salesConsoleM14DealInventoryDepth.inventoryOperatingRows.every((vehicle) => vehicle.readOnlyAction.includes("do not hold"));
}

export function salesConsoleM14DealInventoryRemainReadOnly() {
  return salesConsoleM14DealInventoryDepth.readOnly &&
    salesConsoleM14DealDeskHasOperatingRows() &&
    salesConsoleM14InventoryHasReadinessRows();
}
