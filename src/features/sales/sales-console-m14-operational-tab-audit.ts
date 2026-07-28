export type SalesConsoleM14TabStatus =
  | "live-read-only"
  | "placeholder-heavy"
  | "planned"
  | "should-demote"
  | "source-link-candidate";

export type SalesConsoleM14OperationalTabAuditItem = {
  action: string;
  reason: string;
  status: SalesConsoleM14TabStatus;
  surface: string;
};

export const salesConsoleM14OperationalTabAudit = [
  {
    action: "Deepen with ranked source-linked work cards.",
    reason: "This is the daily seller starting point and should feel useful before dogfood expands.",
    status: "live-read-only",
    surface: "Salesperson Today"
  },
  {
    action: "Deepen lead groups, SLA risk, assignment, duplicate review, and appointment context.",
    reason: "BDC and managers need fewer placeholders and clearer lead leakage signals.",
    status: "placeholder-heavy",
    surface: "Lead Operations"
  },
  {
    action: "Keep visible for managers, but replace generic risk labels with operating queues.",
    reason: "Managers should see the few things worth acting on, not planning evidence.",
    status: "placeholder-heavy",
    surface: "Manager Command Center"
  },
  {
    action: "Deepen with deal blockers, manager review need, and source links.",
    reason: "Deal Desk is a core staff expectation and currently feels too much like a placeholder.",
    status: "placeholder-heavy",
    surface: "Deal Desk"
  },
  {
    action: "Deepen with availability, readiness, blocked vehicle, and match reason labels.",
    reason: "Inventory Intelligence needs to explain why a vehicle is safe to discuss.",
    status: "placeholder-heavy",
    surface: "Inventory Intelligence"
  },
  {
    action: "Keep source links prominent and convert weak buttons into source-link candidates.",
    reason: "The console should remain a launchpad into source systems, not a second system of record.",
    status: "source-link-candidate",
    surface: "Source Links"
  },
  {
    action: "Demote from normal staff view; keep for Admin / Owner review only.",
    reason: "Planning panels create placeholder fatigue for day-to-day users.",
    status: "should-demote",
    surface: "Planning/Admin Panels"
  },
  {
    action: "Keep disabled and secondary until enterprise write workflows are approved.",
    reason: "Messaging, quotes, holds, approvals, finance decisions, and source writes remain unsafe.",
    status: "planned",
    surface: "Future Actions"
  }
] as const satisfies readonly SalesConsoleM14OperationalTabAuditItem[];

export function salesConsoleM14AuditIdentifiesPlaceholderHeavySurfaces() {
  return salesConsoleM14OperationalTabAudit.filter((item) => item.status === "placeholder-heavy").length >= 4;
}

export function salesConsoleM14AuditKeepsWritesPlanned() {
  return salesConsoleM14OperationalTabAudit.some((item) =>
    item.surface === "Future Actions" && item.status === "planned"
  );
}

export function salesConsoleM14AuditDemotesPlanningPanels() {
  return salesConsoleM14OperationalTabAudit.some((item) =>
    item.surface === "Planning/Admin Panels" && item.status === "should-demote"
  );
}
