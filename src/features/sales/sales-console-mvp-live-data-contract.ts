import type { SalesConsoleMvpFreshness } from "./sales-console-mvp-execution";

export type SalesConsoleLiveSourceMode = "read-only";

export type SalesConsoleLiveSourceStatus = "contract-ready" | "needs-mapping" | "placeholder-only";

export type SalesConsoleLiveSource = {
  id: string;
  name: string;
  owner: string;
  mode: SalesConsoleLiveSourceMode;
  status: SalesConsoleLiveSourceStatus;
  feeds: string[];
  freshnessTarget: string;
  fallback: string;
};

export type SalesConsoleReadModelContract = {
  surface: string;
  recordKey: string;
  requiredFields: string[];
  staleRule: string;
  blockedRule: string;
  placeholderRule: string;
};

export type SalesConsoleSourceLinkContract = {
  label: string;
  routePattern: string;
  sourceId: string;
  freshness: SalesConsoleMvpFreshness;
  unavailableLabel: string;
};

export type SalesConsoleAdapterRule = {
  rule: string;
  enforcement: string;
};

export const salesConsoleMvpLiveDataContract = {
  boundary: "Read-only live data contract. The MVP may read, label, and link source records, but it may not mutate sales, finance, inventory, lead, or customer records.",
  liveSources: [
    {
      id: "task-activity",
      name: "Task and activity records",
      owner: "Sales operations",
      mode: "read-only",
      status: "contract-ready",
      feeds: ["Salesperson Today", "Manager Command Center"],
      freshnessTarget: "Current enough for daily priority ranking; show last activity age.",
      fallback: "Priority pending"
    },
    {
      id: "lead-intake",
      name: "Lead intake and assignment records",
      owner: "BDC / Lead Coordinator",
      mode: "read-only",
      status: "contract-ready",
      feeds: ["Lead Operations", "Salesperson Today"],
      freshnessTarget: "Same-day operational freshness; SLA risk must show age.",
      fallback: "SLA unavailable"
    },
    {
      id: "customer-360",
      name: "Customer 360 source records",
      owner: "Customer operations",
      mode: "read-only",
      status: "needs-mapping",
      feeds: ["Customer and source links", "Salesperson Today", "Deal Desk"],
      freshnessTarget: "Resolve to the current customer source record before pilot.",
      fallback: "Customer link unavailable"
    },
    {
      id: "inventory-readiness",
      name: "Inventory readiness and availability records",
      owner: "Inventory operations",
      mode: "read-only",
      status: "needs-mapping",
      feeds: ["Inventory Intelligence", "Salesperson Today"],
      freshnessTarget: "Availability and blockers must be verify-first before presentation.",
      fallback: "Verify before presentation"
    },
    {
      id: "deal-status",
      name: "Deal status and scenario placeholders",
      owner: "Sales manager",
      mode: "read-only",
      status: "placeholder-only",
      feeds: ["Deal Desk", "Manager Command Center"],
      freshnessTarget: "Visibility only until scenario/version records are trusted.",
      fallback: "Scenario visibility only"
    },
    {
      id: "appointment-context",
      name: "Appointment context records",
      owner: "Sales operations",
      mode: "read-only",
      status: "contract-ready",
      feeds: ["Lead Operations", "Salesperson Today", "Customer and source links"],
      freshnessTarget: "Show appointment count and upcoming appointment context with source link.",
      fallback: "Appointment context unavailable"
    }
  ],
  readModels: [
    {
      surface: "Salesperson Today",
      recordKey: "salesWorkItemId",
      requiredFields: ["priorityRank", "customerId", "vehicleId", "stage", "nextAction", "freshness", "blocker", "reason"],
      staleRule: "If activity age is unknown or over SLA, show stale/SLA risk instead of burying the row.",
      blockedRule: "If approval, docs, inventory, or lender state blocks progress, show blocker and reason.",
      placeholderRule: "If source fields are missing, keep the row visible with explicit placeholder labels."
    },
    {
      surface: "Lead Operations",
      recordKey: "leadOperationalSignalId",
      requiredFields: ["leadId", "assignmentState", "slaState", "activityAge", "duplicateReview", "appointmentState"],
      staleRule: "If lead age is unknown, mark SLA unavailable and require source review.",
      blockedRule: "Unassigned, duplicate-review, and over-SLA leads must remain visible.",
      placeholderRule: "If lead source is not mapped, show lead-health unavailable state."
    },
    {
      surface: "Manager Command Center",
      recordKey: "managerRiskSignalId",
      requiredFields: ["riskType", "count", "ownerRole", "lastRefresh", "sourceSurface"],
      staleRule: "If refresh age is unavailable, label dashboard values as planned/placeholder.",
      blockedRule: "Approval and delivery blockers must appear before forecast-only metrics.",
      placeholderRule: "Forecast can remain placeholder-only in MVP if labeled clearly."
    },
    {
      surface: "Inventory Intelligence",
      recordKey: "vehicleMatchId",
      requiredFields: ["vehicleId", "stockNumber", "customerId", "fitScore", "readiness", "availability", "blockerDetail"],
      staleRule: "If readiness freshness is unknown, show verify-first before presentation.",
      blockedRule: "Blocked units cannot be shown as clean recommendations.",
      placeholderRule: "Missing fit signals must show match pending, not a fake score."
    },
    {
      surface: "Deal Desk",
      recordKey: "dealVisibilityId",
      requiredFields: ["dealId", "customerId", "vehicleId", "scenarioLabel", "paymentLabel", "approvalState", "blockerState"],
      staleRule: "If scenario version is stale, show visibility-only and require desk review.",
      blockedRule: "Pending manager, lender, docs, or terms states must be visible.",
      placeholderRule: "No quote submission is allowed from placeholder deal data."
    },
    {
      surface: "Customer and source links",
      recordKey: "sourceRecordLinkId",
      requiredFields: ["sourceType", "sourceId", "route", "owner", "freshness", "unavailableLabel"],
      staleRule: "Broken or stale links must be disabled instead of sending users to bad context.",
      blockedRule: "Missing source ownership blocks pilot signoff for that link type.",
      placeholderRule: "Show source context unavailable when a link cannot be trusted."
    }
  ],
  sourceLinks: [
    {
      label: "Customer 360",
      routePattern: "/customers/customer-360?customerId=:customerId",
      sourceId: "customer-360",
      freshness: "verify-first",
      unavailableLabel: "Customer link unavailable"
    },
    {
      label: "Appointment",
      routePattern: "/appointments?appointmentId=:appointmentId",
      sourceId: "appointment-context",
      freshness: "current",
      unavailableLabel: "Appointment context unavailable"
    },
    {
      label: "Task",
      routePattern: "/tasks/:taskId",
      sourceId: "task-activity",
      freshness: "current",
      unavailableLabel: "Task source unavailable"
    },
    {
      label: "Vehicle",
      routePattern: "/vehicles/360/:vehicleId",
      sourceId: "inventory-readiness",
      freshness: "verify-first",
      unavailableLabel: "Vehicle source unavailable"
    },
    {
      label: "Deal",
      routePattern: "/sales#deal-desk",
      sourceId: "deal-status",
      freshness: "placeholder",
      unavailableLabel: "Deal source visibility only"
    }
  ],
  adapterRules: [
    {
      rule: "Read-only adapters only",
      enforcement: "Adapters may normalize and display source records, but they cannot write to customer, lead, deal, inventory, finance, or appointment systems."
    },
    {
      rule: "No silent freshness failure",
      enforcement: "Unknown freshness must render as stale, placeholder, or verify-first."
    },
    {
      rule: "No fake completeness",
      enforcement: "Missing source fields must be labeled in the UI instead of filled with misleading production-looking data."
    },
    {
      rule: "No risky action escalation",
      enforcement: "Data presence cannot enable messaging, quote submission, vehicle holds, finance decisions, or discount approvals in MVP."
    }
  ]
} as const satisfies {
  boundary: string;
  liveSources: SalesConsoleLiveSource[];
  readModels: SalesConsoleReadModelContract[];
  sourceLinks: SalesConsoleSourceLinkContract[];
  adapterRules: SalesConsoleAdapterRule[];
};
