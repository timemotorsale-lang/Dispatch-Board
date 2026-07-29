import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";

export type SalesConsoleM15ManagerCommandPriority = {
  count: number;
  managerMeaning: string;
  priority: "approval-visibility" | "lead-leakage" | "stale-work" | "vehicle-readiness";
  readOnlyBoundary: string;
};

export const salesConsoleM15ManagerCommandPolish = {
  priorities: [
    {
      count: salesConsoleReadAdapterPreview.deals.filter((deal) => deal.approval.includes("Pending")).length,
      managerMeaning: "Deals that need manager attention in the source workflow.",
      priority: "approval-visibility",
      readOnlyBoundary: "Visibility only; no approval, discount, quote, or finance decision can happen here."
    },
    {
      count: salesConsoleReadAdapterPreview.leadOperations.filter((lead) => lead.tone === "danger").length,
      managerMeaning: "Lead leakage risk from stale, duplicate, or unassigned records.",
      priority: "lead-leakage",
      readOnlyBoundary: "Verify CRM ownership and latest activity before routing staff follow-up."
    },
    {
      count: salesConsoleReadAdapterPreview.sellerQueue.filter((item) => item.freshnessState === "stale").length,
      managerMeaning: "Sales work that may be aging without a current source update.",
      priority: "stale-work",
      readOnlyBoundary: "Use source tasks/customer records for coaching or next action updates."
    },
    {
      count: salesConsoleReadAdapterPreview.inventoryMatches.filter((vehicle) => vehicle.freshnessState === "verify-first" || vehicle.status !== "Ready").length,
      managerMeaning: "Inventory that should not be presented until readiness is confirmed.",
      priority: "vehicle-readiness",
      readOnlyBoundary: "No holds or reservations; verify inventory and recon sources first."
    }
  ] as const satisfies readonly SalesConsoleM15ManagerCommandPriority[],
  readOnly: true
} as const;

export function salesConsoleM15ManagerCommandHasDailyPriorities() {
  return salesConsoleM15ManagerCommandPolish.priorities.length === 4;
}

export function salesConsoleM15ManagerCommandExplainsManagerAction() {
  return salesConsoleM15ManagerCommandPolish.priorities.every((priority) =>
    priority.managerMeaning.length > 0 && priority.count >= 0
  );
}

export function salesConsoleM15ManagerCommandRemainsReadOnly() {
  return salesConsoleM15ManagerCommandPolish.readOnly &&
    salesConsoleM15ManagerCommandPolish.priorities.some((priority) => priority.readOnlyBoundary.includes("no approval")) &&
    salesConsoleM15ManagerCommandPolish.priorities.some((priority) => priority.readOnlyBoundary.includes("No holds"));
}
