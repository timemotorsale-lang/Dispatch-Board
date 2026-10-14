import type { SalesConsoleStaffRole } from "./sales-console-operational-domain";

export const salesConsoleSourceSystems = [
  "CRM / Customers",
  "Appointments / Calendar",
  "Tasks",
  "Inventory / Vehicles",
  "Finance",
  "Service / Repairs",
  "Rental",
  "Warranty",
  "Sales Console Internal"
] as const;

export type SalesConsoleSourceSystem = (typeof salesConsoleSourceSystems)[number];

export type SalesConsoleOwnershipMode =
  | "authoritative-source"
  | "read-through"
  | "sales-console-owned"
  | "governed-handoff";

export type SalesConsoleSourceOwnership = {
  system: SalesConsoleSourceSystem;
  mode: SalesConsoleOwnershipMode;
  readsAllowed: string[];
  salesConsoleWritesAllowed: string[];
  prohibitedWrites: string[];
  sourceLinkPattern: string;
  requiredLabels: Array<"source" | "freshness" | "stale" | "blocked" | "unavailable" | "verify-first">;
};

export const salesConsoleAllowedInternalWrites = [
  "Sales Opportunity",
  "Revenue Opportunity",
  "Sales Activity",
  "Sales Note",
  "Sales Promise",
  "Sales Evidence",
  "Revenue Lane Checklist",
  "Sales Outcome",
  "Manager Review Request link"
] as const;

export const salesConsoleProhibitedWrites = [
  "quote submission",
  "finance decision",
  "discount approval",
  "vehicle hold/reservation",
  "autonomous customer messaging",
  "contract execution",
  "source-system replacement"
] as const;

export const salesConsoleSourceOwnershipMap: SalesConsoleSourceOwnership[] = [
  {
    system: "CRM / Customers",
    mode: "authoritative-source",
    readsAllowed: ["customer identity", "contact preferences", "customer timeline", "open cases", "source customer link"],
    salesConsoleWritesAllowed: ["Sales Opportunity", "Sales Note", "Sales Activity"],
    prohibitedWrites: ["source-system replacement", "autonomous customer messaging"],
    sourceLinkPattern: "/customers/customer-360",
    requiredLabels: ["source", "freshness", "verify-first"]
  },
  {
    system: "Appointments / Calendar",
    mode: "read-through",
    readsAllowed: ["scheduled time", "confirmation status", "arrival state", "no-show state", "appointment source link"],
    salesConsoleWritesAllowed: ["Sales Activity", "Sales Promise"],
    prohibitedWrites: ["source-system replacement"],
    sourceLinkPattern: "/appointments",
    requiredLabels: ["source", "freshness", "stale", "unavailable"]
  },
  {
    system: "Tasks",
    mode: "read-through",
    readsAllowed: ["task due date", "owner", "blocker owner", "promise type", "source task link"],
    salesConsoleWritesAllowed: ["Sales Activity", "Sales Promise", "Sales Note"],
    prohibitedWrites: ["source-system replacement"],
    sourceLinkPattern: "/tasks",
    requiredLabels: ["source", "freshness", "blocked"]
  },
  {
    system: "Inventory / Vehicles",
    mode: "authoritative-source",
    readsAllowed: ["stock number", "VIN where allowed", "availability", "readiness", "age", "pricing posture", "blockers"],
    salesConsoleWritesAllowed: ["Revenue Opportunity", "Sales Evidence", "Sales Activity"],
    prohibitedWrites: ["vehicle hold/reservation", "source-system replacement"],
    sourceLinkPattern: "/inventory",
    requiredLabels: ["source", "freshness", "blocked", "verify-first"]
  },
  {
    system: "Finance",
    mode: "governed-handoff",
    readsAllowed: ["finance readiness", "handoff status", "missing evidence", "finance source link"],
    salesConsoleWritesAllowed: ["Revenue Lane Checklist", "Manager Review Request link"],
    prohibitedWrites: ["finance decision", "discount approval", "contract execution", "source-system replacement"],
    sourceLinkPattern: "/finance",
    requiredLabels: ["source", "freshness", "blocked", "verify-first"]
  },
  {
    system: "Service / Repairs",
    mode: "read-through",
    readsAllowed: ["repair need", "estimate status", "repair order status", "service source link"],
    salesConsoleWritesAllowed: ["Revenue Opportunity", "Sales Activity", "Sales Evidence"],
    prohibitedWrites: ["autonomous customer messaging", "source-system replacement"],
    sourceLinkPattern: "/service",
    requiredLabels: ["source", "freshness", "blocked"]
  },
  {
    system: "Rental",
    mode: "read-through",
    readsAllowed: ["rental inquiry", "rental availability", "date window", "rental source link"],
    salesConsoleWritesAllowed: ["Revenue Opportunity", "Sales Activity", "Sales Promise"],
    prohibitedWrites: ["vehicle hold/reservation", "contract execution", "source-system replacement"],
    sourceLinkPattern: "/rentals",
    requiredLabels: ["source", "freshness", "verify-first"]
  },
  {
    system: "Warranty",
    mode: "governed-handoff",
    readsAllowed: ["product interest", "eligibility", "authorization status", "warranty source link"],
    salesConsoleWritesAllowed: ["Revenue Opportunity", "Revenue Lane Checklist", "Sales Evidence"],
    prohibitedWrites: ["contract execution", "source-system replacement"],
    sourceLinkPattern: "/warranty",
    requiredLabels: ["source", "freshness", "verify-first"]
  },
  {
    system: "Sales Console Internal",
    mode: "sales-console-owned",
    readsAllowed: [...salesConsoleAllowedInternalWrites],
    salesConsoleWritesAllowed: [...salesConsoleAllowedInternalWrites],
    prohibitedWrites: [...salesConsoleProhibitedWrites],
    sourceLinkPattern: "/sales",
    requiredLabels: ["source", "freshness", "blocked", "unavailable", "verify-first"]
  }
];

export const salesConsoleIntegrationMap = [
  { consoleSurface: "Salesperson Today", sourceSystems: ["CRM / Customers", "Appointments / Calendar", "Tasks", "Inventory / Vehicles", "Sales Console Internal"] },
  { consoleSurface: "Lead Operations", sourceSystems: ["CRM / Customers", "Appointments / Calendar", "Tasks", "Sales Console Internal"] },
  { consoleSurface: "Revenue Desk", sourceSystems: ["CRM / Customers", "Inventory / Vehicles", "Finance", "Service / Repairs", "Rental", "Warranty", "Sales Console Internal"] },
  { consoleSurface: "Inventory Intelligence", sourceSystems: ["Inventory / Vehicles", "CRM / Customers", "Finance", "Sales Console Internal"] },
  { consoleSurface: "Manager Command Center", sourceSystems: [...salesConsoleSourceSystems] },
  { consoleSurface: "Admin / Source Health", sourceSystems: [...salesConsoleSourceSystems] }
] as const;

export const salesConsoleAlgorithmMap = [
  "Sales Work Queue Ranking",
  "Lead Operations SLA and Dedupe Logic",
  "Inventory Match Scoring",
  "Revenue Desk Lane Workflow Rules",
  "Manager Command Risk Queues",
  "Federated Sales Search Ranking"
] as const;

export const salesConsoleConnectedMvpDeploymentGates = [
  "Every visible tab changes to an operating workspace",
  "Every connected source is labeled with owner and freshness",
  "Every Sales Console-owned write has audit and idempotency metadata",
  "Risky workflows remain governed or source-system controlled",
  "Evidence upload is guarded by permission, type, size, source link, and audit metadata",
  "Algorithms return deterministic reasons staff can understand",
  "Role visibility is enforced for Salesperson, BDC / Lead Coordinator, Sales Manager, and Admin / Owner"
] as const;

export function salesConsoleSourceOwnershipCoversEverySystem() {
  const mappedSystems = new Set(salesConsoleSourceOwnershipMap.map((entry) => entry.system));

  return salesConsoleSourceSystems.every((system) => mappedSystems.has(system));
}

export function salesConsoleGuardrailsKeepRiskyWritesOutOfAllowedWrites() {
  const prohibited = salesConsoleProhibitedWrites.map((write) => write.toLowerCase());

  return salesConsoleSourceOwnershipMap.every((entry) =>
    entry.salesConsoleWritesAllowed.every((write) =>
      prohibited.every((prohibitedWrite) => !write.toLowerCase().includes(prohibitedWrite))
    )
  );
}

export function salesConsoleRoleCanReviewSourceHealth(role: SalesConsoleStaffRole) {
  return role === "Admin / Owner" || role === "Sales Manager";
}
