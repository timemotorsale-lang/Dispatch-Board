export const salesConsoleM25ResponsiveOperatingViews = {
  milestone: "Milestone 25 — Replace Remaining Placeholder Tabs With Responsive Operating Views",
  operatingPosture:
    "Every primary Sales Console tab has a responsive operating view, source-shaped records, clear state labels, and safe actions.",
  liveWriteWorkflow: "Manager Review Request",
  tabs: [
    {
      tab: "Salesperson Today",
      href: "#today",
      state: "operating",
      primaryAction: "Open ranked work queue",
      safeAction: "Review customer, vehicle, blocker, and freshness context.",
      blockedAction: "Customer messaging automation remains disabled."
    },
    {
      tab: "Lead Operations",
      href: "#lead-operations",
      state: "operating",
      primaryAction: "Open lead risk board",
      safeAction: "Review SLA risk, assignment, duplicate, and appointment context.",
      blockedAction: "CRM ownership changes and messaging automation remain disabled."
    },
    {
      tab: "Deal Desk",
      href: "#deal-desk",
      state: "operating",
      primaryAction: "Open deal desk",
      safeAction: "Submit Manager Review Request when source fields are complete.",
      blockedAction: "Quote submission, finance decisions, and discount approvals remain disabled."
    },
    {
      tab: "Inventory Intelligence",
      href: "#inventory-intelligence",
      state: "operating",
      primaryAction: "Open inventory readiness",
      safeAction: "Review fit, readiness, stale, blocked, and verify-first labels.",
      blockedAction: "Vehicle holds and reservations remain disabled."
    },
    {
      tab: "Manager Command Center",
      href: "#command-center",
      state: "operating",
      primaryAction: "Open manager risk rail",
      safeAction: "Review team risk, manager review workbench, pilot health, and release gates.",
      blockedAction: "Manager resolution commands remain planned/disabled."
    },
    {
      tab: "Staff Readiness",
      href: "#command-center",
      state: "operating",
      primaryAction: "Open staff rollout readiness",
      safeAction: "Review role readiness, support owner, training, rollback, and monitoring.",
      blockedAction: "Official release remains conditional until owner approval."
    }
  ],
  universalStates: ["loading", "empty", "stale", "unavailable", "duplicate", "conflict", "blocked"],
  guardrails: [
    "No blank primary tabs",
    "No placeholder-only primary tabs",
    "Only Manager Review Request can submit",
    "Every non-live button explains disabled/planned state",
    "Source systems remain authoritative"
  ]
} as const;

export function salesConsoleM25EveryPrimaryTabIsOperating() {
  return salesConsoleM25ResponsiveOperatingViews.tabs.every((tab) => tab.state === "operating");
}

export function salesConsoleM25EveryTabHasSafeAction() {
  return salesConsoleM25ResponsiveOperatingViews.tabs.every((tab) => Boolean(tab.safeAction && tab.blockedAction));
}

export function salesConsoleM25OnlyManagerReviewSubmitIsLive() {
  return salesConsoleM25ResponsiveOperatingViews.liveWriteWorkflow === "Manager Review Request";
}

export function salesConsoleM25NoPlaceholderOnlyPrimaryTabs() {
  return salesConsoleM25ResponsiveOperatingViews.guardrails.includes("No placeholder-only primary tabs");
}
