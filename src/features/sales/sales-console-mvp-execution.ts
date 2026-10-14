export type SalesConsoleMvpRole = "admin-owner" | "bdc-lead-coordinator" | "sales-manager" | "salesperson";

export type SalesConsoleMvpTone = "danger" | "good" | "neutral" | "warning";

export type SalesConsoleMvpFreshness = "current" | "placeholder" | "stale" | "verify-first";

export type SalesConsoleMvpShellCheck = {
  check: string;
  status: "ready" | "review";
  proof: string;
};

export type SalesConsoleMvpRoleView = {
  role: SalesConsoleMvpRole;
  label: string;
  primarySurface: string;
  visibility: string;
  disabledActions: string[];
};

export type SalesConsoleMvpReadOnlyGuardrail = {
  action: string;
  status: "disabled" | "planned";
  reason: string;
};

export type SalesConsoleMvpDataContractField = {
  field: string;
  surface: string;
  source: string;
  freshness: SalesConsoleMvpFreshness;
  fallbackLabel: string;
};

export type SalesConsoleMvpPilotReadinessCheck = {
  check: string;
  status: "ready" | "review";
  evidence: string;
};

export const salesConsoleMvpExecution = {
  defaultRole: "sales-manager",
  shellChecks: [
    {
      check: "/sales route shell",
      status: "ready",
      proof: "Route renders the enterprise Sales Console without write actions."
    },
    {
      check: "Sales loading state",
      status: "ready",
      proof: "Dedicated loading copy explains queue, deal desk, inventory, and manager command surfaces."
    },
    {
      check: "Sales unavailable state",
      status: "ready",
      proof: "Dedicated error state supports retry and safe return to Dispatch Board."
    },
    {
      check: "Protected-route behavior",
      status: "review",
      proof: "Uses the app shell protection path; pilot roles still need real auth mapping."
    }
  ],
  roleViews: [
    {
      role: "salesperson",
      label: "Salesperson",
      primarySurface: "Salesperson Today",
      visibility: "Own queue, assigned leads, customer context, matched inventory, and own read-only deals.",
      disabledActions: ["Submit quote", "Reserve vehicle", "Send automated message", "Approve discount"]
    },
    {
      role: "sales-manager",
      label: "Sales Manager",
      primarySurface: "Manager Command Center",
      visibility: "Team risk queues, lead health, approval placeholders, deal desk, forecast, and top opportunities.",
      disabledActions: ["Finalize discount approval", "Override finance outcome", "Bypass stale-data warnings"]
    },
    {
      role: "bdc-lead-coordinator",
      label: "BDC / Lead Coordinator",
      primarySurface: "Lead Operations",
      visibility: "Lead intake health, SLA risk, unassigned leads, duplicate review, appointments, and follow-up context.",
      disabledActions: ["Change deal structure", "Reserve inventory", "Automate outbound messaging"]
    },
    {
      role: "admin-owner",
      label: "Admin / Owner",
      primarySurface: "Pilot Readiness",
      visibility: "All MVP planning panels, role configuration, data-source status, and future-action placeholders.",
      disabledActions: ["Enable risky writes without release gate", "Treat placeholder data as production truth"]
    }
  ],
  readOnlyGuardrails: [
    {
      action: "Customer messaging automation",
      status: "planned",
      reason: "Requires consent, templates, audit history, and manager controls."
    },
    {
      action: "Quote submission",
      status: "disabled",
      reason: "Financial action requiring deal rules, approvals, lender logic, and audit trails."
    },
    {
      action: "Vehicle holds or reservations",
      status: "disabled",
      reason: "Inventory availability must be trusted before operational holds are allowed."
    },
    {
      action: "Finance decisions",
      status: "disabled",
      reason: "Requires compliance workflow, lender integration, and strict authority controls."
    },
    {
      action: "Discount approvals",
      status: "disabled",
      reason: "Gross-impact approval belongs behind a future manager workflow gate."
    }
  ],
  dataContractFields: [
    {
      field: "priorityRank",
      surface: "Salesperson Today",
      source: "Task, lead, activity, and appointment records",
      freshness: "current",
      fallbackLabel: "Priority pending"
    },
    {
      field: "customerContextLink",
      surface: "Customer and source links",
      source: "Customer 360 source record",
      freshness: "verify-first",
      fallbackLabel: "Customer link unavailable"
    },
    {
      field: "leadSlaState",
      surface: "Lead Operations",
      source: "Lead intake and activity timestamps",
      freshness: "current",
      fallbackLabel: "SLA unavailable"
    },
    {
      field: "vehicleReadiness",
      surface: "Inventory Intelligence",
      source: "Inventory readiness, availability, and blocker records",
      freshness: "verify-first",
      fallbackLabel: "Verify before presentation"
    },
    {
      field: "dealScenarioLabel",
      surface: "Deal Desk",
      source: "Deal record and scenario/version placeholder",
      freshness: "placeholder",
      fallbackLabel: "Scenario visibility only"
    },
    {
      field: "managerRiskQueue",
      surface: "Manager Command Center",
      source: "Aggregated sales queue, lead health, and activity records",
      freshness: "stale",
      fallbackLabel: "Refresh risk queue"
    }
  ],
  pilotReadinessChecks: [
    {
      check: "Render smoke",
      status: "ready",
      evidence: "Sales console renders shell, queue, deal desk, inventory, manager rail, and planning panels."
    },
    {
      check: "Read-only guardrails",
      status: "ready",
      evidence: "Excluded MVP actions are represented as disabled or planned, not executable commands."
    },
    {
      check: "Role placeholders",
      status: "ready",
      evidence: "Salesperson, manager, BDC, and admin views are documented in the UI."
    },
    {
      check: "Data honesty labels",
      status: "review",
      evidence: "Freshness, placeholder, stale, and verify-first labels are visible before live data wiring."
    }
  ]
} as const satisfies {
  defaultRole: SalesConsoleMvpRole;
  shellChecks: SalesConsoleMvpShellCheck[];
  roleViews: SalesConsoleMvpRoleView[];
  readOnlyGuardrails: SalesConsoleMvpReadOnlyGuardrail[];
  dataContractFields: SalesConsoleMvpDataContractField[];
  pilotReadinessChecks: SalesConsoleMvpPilotReadinessCheck[];
};
