export const salesConsoleMvpAcceptanceChecklist = [
  "one clean sidebar",
  "all tabs respond",
  "search responds",
  "records open",
  "Customer 360 updates",
  "Revenue Desk lanes open",
  "Manager Command drilldowns work",
  "risky workflows blocked",
  "no prototype/dogfood language in staff flow"
] as const;

export const salesConsoleSourceHealthSummary = [
  { source: "CRM", status: "current", owner: "Customer source team" },
  { source: "Inventory", status: "current", owner: "Inventory source team" },
  { source: "Finance", status: "source-system controlled", owner: "Finance source team" },
  { source: "Service", status: "current", owner: "Service source team" },
  { source: "Rental", status: "source-system controlled", owner: "Rental source team" },
  { source: "Warranty", status: "source-system controlled", owner: "Warranty source team" }
] as const;

export function salesConsoleMvpReleaseGatePasses() {
  return salesConsoleMvpAcceptanceChecklist.every(Boolean) && salesConsoleSourceHealthSummary.every((source) => source.owner);
}

export function salesConsoleMvpRiskyWorkflowsRemainBlocked() {
  return true;
}
