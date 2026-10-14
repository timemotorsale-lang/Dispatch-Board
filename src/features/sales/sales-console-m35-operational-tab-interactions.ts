export type SalesConsoleM35TabId =
  | "salesperson-today"
  | "lead-operations"
  | "manager-command-center"
  | "inventory-intelligence"
  | "deal-desk"
  | "manager-review"
  | "pilot-rollout-readiness"
  | "admin-owner";

export type SalesConsoleM35RoleId = "salesperson" | "sales-manager" | "bdc-lead-coordinator" | "admin-owner";

export type SalesConsoleM35PanelId = "help" | "scope" | null;

export type SalesConsoleM35Tab = {
  id: SalesConsoleM35TabId;
  label: string;
  headline: string;
  operatingContent: string;
  safeAction: string;
  blockedAction: string;
  sourceBehavior: string;
};

export type SalesConsoleM35Role = {
  id: SalesConsoleM35RoleId;
  label: string;
  defaultTab: SalesConsoleM35TabId;
  contextSummary: string;
};

export const salesConsoleM35OperationalTabs: SalesConsoleM35Tab[] = [
  {
    id: "salesperson-today",
    label: "Salesperson Today",
    headline: "Ranked seller work queue",
    operatingContent: "Prioritize customers, vehicles, blockers, freshness, and next safe follow-up.",
    safeAction: "Review ranked work and request manager review when the source context is complete.",
    blockedAction: "Customer messaging automation remains outside the MVP console.",
    sourceBehavior: "Uses adapter-ranked seller queue and source/freshness labels."
  },
  {
    id: "lead-operations",
    label: "Lead Operations",
    headline: "Lead risk and assignment board",
    operatingContent: "Review duplicate risk, response SLA, assignment gaps, appointment context, and CRM/source links.",
    safeAction: "Verify lead ownership and response risk before acting in the CRM/source system.",
    blockedAction: "CRM ownership changes and automated outreach are not active here.",
    sourceBehavior: "Uses lead operations adapter output with verify-first labels."
  },
  {
    id: "manager-command-center",
    label: "Manager Command Center",
    headline: "Team risk and operating command rail",
    operatingContent: "Review team blockers, stale deals, inventory pressure, review queues, and readiness gates.",
    safeAction: "Triage risk and coach from source-aware context.",
    blockedAction: "Manager resolution, discount, quote, finance, hold, and messaging actions stay unavailable.",
    sourceBehavior: "Uses manager command center read model and rollout health labels."
  },
  {
    id: "inventory-intelligence",
    label: "Inventory Intelligence",
    headline: "Vehicle match and readiness intelligence",
    operatingContent: "Review matched vehicles, fit score, readiness, blocked units, stale data, and verify-first prompts.",
    safeAction: "Use inventory context to prepare source-system follow-up.",
    blockedAction: "Vehicle holds and reservations are not active in the Sales Console MVP.",
    sourceBehavior: "Uses inventory intelligence adapter rows and inventory source labels."
  },
  {
    id: "deal-desk",
    label: "Deal Desk",
    headline: "Deal context and manager-review intake",
    operatingContent: "Review deal rows, scenario context, blockers, source confidence, and Manager Review Request readiness.",
    safeAction: "Submit Manager Review Request only when required fields are present.",
    blockedAction: "Quote submission, finance decisions, and discount approvals remain unavailable.",
    sourceBehavior: "Uses deal desk read model and Manager Review Request audit/idempotency data."
  },
  {
    id: "manager-review",
    label: "Manager Review",
    headline: "Manager Review Request workflow",
    operatingContent: "Submit valid manager review requests and review workbench context with audit and reference IDs.",
    safeAction: "Manager Review Request is the only controlled live submit workflow.",
    blockedAction: "Resolution, approval, finance, quote, hold, and messaging commands remain blocked.",
    sourceBehavior: "Uses the approved manager-review endpoint and read-only workbench records."
  },
  {
    id: "pilot-rollout-readiness",
    label: "Pilot / Rollout Readiness",
    headline: "Deployment smoke, rollout checklist, and first-day monitoring",
    operatingContent: "Review environment smoke checks, role verification, rollout guide, go/no-go gates, support owner, and rollback path.",
    safeAction: "Use the checklist to decide whether staff access can expand.",
    blockedAction: "Official release remains conditional until environment verification passes.",
    sourceBehavior: "Uses rollout readiness models and manual deployed-environment verification labels."
  },
  {
    id: "admin-owner",
    label: "Admin / Owner",
    headline: "Owner release control and guardrail evidence",
    operatingContent: "Review deployment health, role coverage, source labels, blocked workflow evidence, and next-phase planning.",
    safeAction: "Approve controlled rollout only after all go/no-go gates pass.",
    blockedAction: "Admin review does not unlock broad writes or replace source systems.",
    sourceBehavior: "Uses admin-only readiness evidence and release decision models."
  }
];

export const salesConsoleM35OperationalRoles: SalesConsoleM35Role[] = [
  {
    id: "salesperson",
    label: "Salesperson",
    defaultTab: "salesperson-today",
    contextSummary: "Seller view focuses on ranked work, blockers, customer context, and safe manager review requests."
  },
  {
    id: "sales-manager",
    label: "Sales Manager",
    defaultTab: "manager-command-center",
    contextSummary: "Manager view focuses on team risk, manager review workbench, stale source context, and coaching priorities."
  },
  {
    id: "bdc-lead-coordinator",
    label: "BDC / Lead Coordinator",
    defaultTab: "lead-operations",
    contextSummary: "Lead operations view focuses on response risk, duplicate risk, assignment gaps, and CRM/source verification."
  },
  {
    id: "admin-owner",
    label: "Admin / Owner",
    defaultTab: "admin-owner",
    contextSummary: "Owner view focuses on deployment readiness, role coverage, support ownership, and release gates."
  }
];

export const salesConsoleM35ScopePanel = {
  title: "MVP scope for Time Motor Sales",
  body: "This console covers one-store MVP visibility, source-aware operating context, and Manager Review Request only. Quotes, discounts, finance decisions, holds, messaging automation, and CRM/DMS replacement remain outside this release."
} as const;

export const salesConsoleM35HelpPanel = {
  title: "How to use the Sales Console MVP",
  body: "Choose a tab, verify source labels, act in the owning source system when needed, and use Manager Review Request only for approved manager review intake."
} as const;

export function salesConsoleM35TabById(tabId: SalesConsoleM35TabId) {
  return salesConsoleM35OperationalTabs.find((tab) => tab.id === tabId) ?? salesConsoleM35OperationalTabs[0];
}

export function salesConsoleM35RoleById(roleId: SalesConsoleM35RoleId) {
  return salesConsoleM35OperationalRoles.find((role) => role.id === roleId) ?? salesConsoleM35OperationalRoles[0];
}

export function salesConsoleM35DefaultTabForRole(roleId: SalesConsoleM35RoleId) {
  return salesConsoleM35RoleById(roleId).defaultTab;
}

export function salesConsoleM35EveryPrimaryTabIsSelectable() {
  return salesConsoleM35OperationalTabs.length === 8 &&
    salesConsoleM35OperationalTabs.every((tab) => Boolean(tab.id && tab.label && tab.operatingContent));
}

export function salesConsoleM35EveryRoleChangesContext() {
  return salesConsoleM35OperationalRoles.length === 4 &&
    salesConsoleM35OperationalRoles.every((role) => role.defaultTab === salesConsoleM35DefaultTabForRole(role.id));
}

export function salesConsoleM35OnlyManagerReviewIsLiveSubmit() {
  return salesConsoleM35OperationalTabs.every((tab) =>
    tab.id === "manager-review"
      ? tab.safeAction.includes("only controlled live submit workflow")
      : !tab.safeAction.toLowerCase().includes("submit quote")
  );
}

export function salesConsoleM35PanelsRespond() {
  return salesConsoleM35HelpPanel.body.includes("Choose a tab") &&
    salesConsoleM35ScopePanel.body.includes("Manager Review Request only");
}
