import { salesConsoleReadAdapterPreview } from "./sales-console-mvp-read-adapters";

export type SalesConsoleM14SalespersonWorkGroup = {
  explanation: string;
  group: "blocked-now" | "fresh-work" | "stale-follow-up" | "verify-first";
  manualAction: string;
  sourcePrompt: string;
  count: number;
};

export const salesConsoleM14SalespersonTodayDepth = {
  groups: [
    {
      count: salesConsoleReadAdapterPreview.sellerQueue.filter((item) => item.tone === "danger").length,
      explanation: "Blocked or overdue work should be reviewed first because it can stall deals or create customer leakage.",
      group: "blocked-now",
      manualAction: "Open the source task/customer record and verify the blocker before contacting the customer.",
      sourcePrompt: "Use Customer 360, Task, and Vehicle source links before acting."
    },
    {
      count: salesConsoleReadAdapterPreview.sellerQueue.filter((item) => item.freshnessState === "current").length,
      explanation: "Current records are safe to review, but still require source verification before real-world action.",
      group: "fresh-work",
      manualAction: "Work the next action manually in the source system.",
      sourcePrompt: "Confirm CRM ownership and task status first."
    },
    {
      count: salesConsoleReadAdapterPreview.sellerQueue.filter((item) => item.freshnessState === "stale").length,
      explanation: "Stale records need verification because the selling context may have changed.",
      group: "stale-follow-up",
      manualAction: "Verify latest CRM/task activity before deciding the next follow-up.",
      sourcePrompt: "Check the timestamp and source record before trusting the row."
    },
    {
      count: salesConsoleReadAdapterPreview.sellerQueue.filter((item) => item.freshnessState === "placeholder" || item.freshnessState === "verify-first").length,
      explanation: "Placeholder or verify-first rows can guide investigation, but should not be treated as final truth.",
      group: "verify-first",
      manualAction: "Investigate source records before taking any customer-facing action.",
      sourcePrompt: "Do not act from placeholder data alone."
    }
  ] as const satisfies readonly SalesConsoleM14SalespersonWorkGroup[],
  readOnly: true
} as const;

export function salesConsoleM14SalespersonTodayHasOperatingGroups() {
  return salesConsoleM14SalespersonTodayDepth.groups.length === 4;
}

export function salesConsoleM14SalespersonTodayRemainsReadOnly() {
  return salesConsoleM14SalespersonTodayDepth.readOnly &&
    salesConsoleM14SalespersonTodayDepth.groups.every((group) =>
      group.manualAction.includes("source") || group.manualAction.includes("Verify") || group.manualAction.includes("Work")
    );
}

export function salesConsoleM14SalespersonTodayExplainsBlockersAndFreshness() {
  return salesConsoleM14SalespersonTodayDepth.groups.every((group) =>
    group.explanation.length > 40 && group.sourcePrompt.length > 25
  );
}
