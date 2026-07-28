import { salesConsoleMvpExecution, type SalesConsoleMvpRole } from "./sales-console-mvp-execution";
import { salesConsoleReadAdapterPreview, type SalesConsoleReadAdapterViewModel } from "./sales-console-mvp-read-adapters";

export type SalesConsoleSurface =
  | "Adapter Safety Rules"
  | "Adapter Source Links"
  | "Deal Desk"
  | "Inventory Intelligence"
  | "Lead Operations"
  | "Live Data Contract"
  | "Manager Command Center"
  | "MVP Planning Panels"
  | "Pilot Readiness"
  | "Read Adapter Preview"
  | "Real Data Wiring"
  | "Salesperson Today"
  | "Source Link Contracts";

export type SalesConsoleExcludedWorkflow =
  | "Customer messaging automation"
  | "Discount approvals"
  | "Finance decisions"
  | "Quote submission"
  | "Vehicle holds or reservations";

export type SalesConsoleRoleAction = {
  enabled: false;
  label: SalesConsoleExcludedWorkflow;
  reason: string;
  state: "disabled" | "planned";
};

export type SalesConsoleRoleViewPolicy = {
  defaultSurface: SalesConsoleSurface;
  label: string;
  placeholderBehavior: string;
  restrictedSurfaces: SalesConsoleSurface[];
  role: SalesConsoleMvpRole;
  sensitiveDataBoundary: string;
  visibleSurfaces: SalesConsoleSurface[];
};

export type SalesConsoleRoleViewModel = SalesConsoleRoleViewPolicy & {
  blockedActionCount: number;
  dealsVisible: number;
  futureActions: SalesConsoleRoleAction[];
  inventoryMatchesVisible: number;
  leadSignalsVisible: number;
  managerRisksVisible: number;
  readOnly: true;
  sellerQueueVisible: number;
  sourceSystemBoundary: string;
};

const allOperatingSurfaces = [
  "Salesperson Today",
  "Lead Operations",
  "Manager Command Center",
  "Inventory Intelligence",
  "Deal Desk",
  "Adapter Source Links",
  "Source Link Contracts",
  "Read Adapter Preview",
  "Adapter Safety Rules",
  "Live Data Contract",
  "Real Data Wiring",
  "Pilot Readiness",
  "MVP Planning Panels"
] as const satisfies SalesConsoleSurface[];

export const salesConsoleRoleViewPolicies = [
  {
    defaultSurface: "Salesperson Today",
    label: "Salesperson",
    placeholderBehavior: "Own-assigned filtering remains a pilot placeholder until the auth user maps to sales ownership.",
    restrictedSurfaces: ["Manager Command Center", "Live Data Contract", "Real Data Wiring", "Pilot Readiness", "MVP Planning Panels"],
    role: "salesperson",
    sensitiveDataBoundary: "Can see own queue, assigned customer context, matched inventory, and own visibility-only deal rows.",
    visibleSurfaces: ["Salesperson Today", "Inventory Intelligence", "Deal Desk", "Adapter Source Links", "Source Link Contracts"]
  },
  {
    defaultSurface: "Manager Command Center",
    label: "Sales Manager",
    placeholderBehavior: "Team scope is visible for pilot review; approval execution stays disabled until later release gates.",
    restrictedSurfaces: ["Live Data Contract", "Real Data Wiring"],
    role: "sales-manager",
    sensitiveDataBoundary: "Can see team risk, lead leakage, deal desk visibility, inventory blockers, and source links.",
    visibleSurfaces: ["Manager Command Center", "Salesperson Today", "Lead Operations", "Inventory Intelligence", "Deal Desk", "Adapter Source Links", "Source Link Contracts", "Pilot Readiness"]
  },
  {
    defaultSurface: "Lead Operations",
    label: "BDC / Lead Coordinator",
    placeholderBehavior: "Lead ownership and assignment cues are read-only until source-system assignment writes are explicitly added.",
    restrictedSurfaces: ["Manager Command Center", "Deal Desk", "Live Data Contract", "Real Data Wiring", "Pilot Readiness", "MVP Planning Panels"],
    role: "bdc-lead-coordinator",
    sensitiveDataBoundary: "Can see lead intake health, SLA risk, duplicate review, appointments, customer context, and source links.",
    visibleSurfaces: ["Lead Operations", "Salesperson Today", "Adapter Source Links", "Source Link Contracts"]
  },
  {
    defaultSurface: "Pilot Readiness",
    label: "Admin / Owner",
    placeholderBehavior: "Can review all MVP panels and role configuration, but still cannot activate excluded workflows.",
    restrictedSurfaces: [],
    role: "admin-owner",
    sensitiveDataBoundary: "Can see all MVP read-only surfaces for readiness, source ownership, and release control.",
    visibleSurfaces: [...allOperatingSurfaces]
  }
] as const satisfies SalesConsoleRoleViewPolicy[];

export function buildSalesConsoleRoleView(
  role: SalesConsoleMvpRole,
  readModel: SalesConsoleReadAdapterViewModel = salesConsoleReadAdapterPreview
): SalesConsoleRoleViewModel {
  const policy = salesConsoleRoleViewPolicies.find((view) => view.role === role);

  if (!policy) {
    throw new Error(`Unsupported Sales Console role: ${role}`);
  }

  const visibleSurfaces: readonly SalesConsoleSurface[] = policy.visibleSurfaces;
  const canSee = (surface: SalesConsoleSurface) => visibleSurfaces.includes(surface);
  const futureActions = salesConsoleMvpExecution.readOnlyGuardrails.map((guardrail) => ({
    enabled: false as const,
    label: guardrail.action as SalesConsoleExcludedWorkflow,
    reason: guardrail.reason,
    state: guardrail.status
  })) satisfies SalesConsoleRoleAction[];

  return {
    ...policy,
    blockedActionCount: futureActions.length,
    dealsVisible: canSee("Deal Desk") ? readModel.deals.length : 0,
    futureActions,
    inventoryMatchesVisible: canSee("Inventory Intelligence") ? readModel.inventoryMatches.length : 0,
    leadSignalsVisible: canSee("Lead Operations") ? readModel.leadOperations.length : 0,
    managerRisksVisible: canSee("Manager Command Center") ? readModel.managerRisks.length : 0,
    readOnly: true,
    sellerQueueVisible: canSee("Salesperson Today") ? readModel.sellerQueue.length : 0,
    sourceSystemBoundary: "CRM, DMS, lead, deal, inventory, finance, task, and appointment records remain the system of record."
  };
}

export const salesConsoleRoleViews = salesConsoleRoleViewPolicies.map((policy) =>
  buildSalesConsoleRoleView(policy.role)
);

export function salesConsoleRoleGuardrailsRemainDisabled(roleViews = salesConsoleRoleViews) {
  return roleViews.every((roleView) =>
    roleView.futureActions.every((action) => action.enabled === false)
  );
}
