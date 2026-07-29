import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";

export type SalesConsoleM15EmptyStateClarityItem = {
  fallbackLabel: "empty" | "stale" | "verify-first" | "unavailable";
  section: string;
  staffMessage: string;
  verificationStep: string;
};

export const salesConsoleM15EmptyStateClarity = {
  items: [
    {
      fallbackLabel: salesConsoleReadAdapterPreview.sellerQueue.length === 0 ? "empty" : "verify-first",
      section: "Salesperson Today",
      staffMessage: salesConsoleReadAdapterPreview.sellerQueue.length === 0
        ? "No ranked seller work is available yet."
        : "Seller work is visible; verify source records before customer-facing action.",
      verificationStep: "Check task/customer source records before deciding next action."
    },
    {
      fallbackLabel: salesConsoleReadAdapterPreview.leadOperations.some((lead) => lead.freshnessState === "stale") ? "stale" : "verify-first",
      section: "Lead Operations",
      staffMessage: "Lead status may depend on CRM assignment, duplicate review, and latest activity.",
      verificationStep: "Open CRM lead source before reassignment, merge decisions, or outreach."
    },
    {
      fallbackLabel: salesConsoleReadAdapterPreview.deals.some((deal) => deal.freshnessState === "placeholder") ? "unavailable" : "verify-first",
      section: "Deal Desk",
      staffMessage: "Some scenario/payment information may be source visibility only.",
      verificationStep: "Open the source deal record before discussing quote, payment, or structure."
    },
    {
      fallbackLabel: salesConsoleReadAdapterPreview.inventoryMatches.some((vehicle) => vehicle.freshnessState === "verify-first") ? "verify-first" : "empty",
      section: "Inventory Intelligence",
      staffMessage: "Vehicle readiness can change quickly and must be source-confirmed.",
      verificationStep: "Verify inventory, recon, and availability before presenting a vehicle."
    }
  ] as const satisfies readonly SalesConsoleM15EmptyStateClarityItem[],
  readOnly: true
} as const;

export function salesConsoleM15EmptyStatesCoverOperatingSections() {
  return salesConsoleM15EmptyStateClarity.items.length === 4;
}

export function salesConsoleM15EmptyStatesExplainFallbacks() {
  return salesConsoleM15EmptyStateClarity.items.every((item) =>
    item.staffMessage.length > 0 && item.verificationStep.length > 0
  );
}

export function salesConsoleM15EmptyStatesRemainReadOnly() {
  return salesConsoleM15EmptyStateClarity.readOnly &&
    salesConsoleM15EmptyStateClarity.items.every((item) => item.verificationStep.includes("Check") || item.verificationStep.includes("Open") || item.verificationStep.includes("Verify"));
}
