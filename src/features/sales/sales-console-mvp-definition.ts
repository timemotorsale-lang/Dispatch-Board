export const salesConsoleMvpDefinition = {
  goal: "Build a stable MVP console with an enterprise foundation that can expand later.",
  includedCapabilities: [
    "Stable /sales operating surface",
    "Approved enterprise layout and navigation",
    "Read-only visibility into sales work, leads, deals, inventory fit, and manager risk",
    "Role-aware access and sensitive-action guardrails",
    "Expansion path for opportunity workflow, deal desk, approvals, finance handoff, and reporting"
  ],
  excludedCapabilities: [
    "Customer messaging automation",
    "Quote submission",
    "Vehicle holds or reservations",
    "Finance decisions",
    "Discount approvals"
  ],
  operatingBoundary: "Read-only MVP foundation. No high-risk sales actions are authorized.",
  principles: [
    {
      name: "Narrow scope",
      meaning: "Build the smallest console that is useful every day."
    },
    {
      name: "Enterprise shape",
      meaning: "Use permanent navigation, data boundaries, permissions, and audit posture."
    },
    {
      name: "Read first",
      meaning: "Start with trusted visibility before commands."
    },
    {
      name: "No risky writes",
      meaning: "Avoid customer messaging, quotes, vehicle holds, finance decisions, and discount approvals."
    },
    {
      name: "Expand cleanly",
      meaning: "Every MVP section should map to future workflows without rework."
    },
    {
      name: "Manager-visible",
      meaning: "The MVP must help managers see risk early, not only help salespeople view tasks."
    }
  ],
  milestoneRoadmap: [
    {
      id: "SAL-MVP-00",
      milestone: "Approval and scope lock",
      scope: "Confirm mockup, MVP boundaries, pilot users, and no-risk action policy.",
      exitProof: "Written approval of MVP scope and visual direction."
    },
    {
      id: "SAL-MVP-01",
      milestone: "Sales Console shell",
      scope: "Stable /sales route, sales navigation, loading/error states, responsive console layout.",
      exitProof: "Sales user can open /sales; unauthenticated/denied paths are handled clearly."
    },
    {
      id: "SAL-MVP-02",
      milestone: "Visual foundation",
      scope: "Translate approval mockup into reusable UI patterns: topbar, KPI strip, dense tables, manager rail, status chips.",
      exitProof: "UI matches approved enterprise direction closely enough for stakeholder review."
    },
    {
      id: "SAL-MVP-03",
      milestone: "Read-only data contract",
      scope: "Define which existing records feed the MVP: tasks, customers, leads, appointments, vehicles, deal placeholders.",
      exitProof: "Data-source map shows owner, freshness, and fallback for each field."
    },
    {
      id: "SAL-MVP-04",
      milestone: "Salesperson Today MVP",
      scope: "Show a ranked seller queue with customer, vehicle, stage, next action, freshness, blocker, and reason.",
      exitProof: "Salesperson can understand top priorities within 30 seconds."
    },
    {
      id: "SAL-MVP-05",
      milestone: "Lead Operations MVP",
      scope: "Show lead intake health, new leads, unassigned/stale leads, SLA risk, duplicate-review indicators.",
      exitProof: "Manager/BDC can identify leads needing attention without changing records."
    },
    {
      id: "SAL-MVP-06",
      milestone: "Manager Command Center MVP",
      scope: "Show risk queues, approvals-needed placeholders, delivery blockers, forecast placeholder, and top opportunities.",
      exitProof: "Manager can drill from risk summary to underlying records or planned placeholders."
    },
    {
      id: "SAL-MVP-07",
      milestone: "Inventory Intelligence MVP",
      scope: "Show customer-fit vehicle matches, readiness state, availability, blockers, and fit reasons.",
      exitProof: "Blocked vehicles are never presented as clean recommendations."
    },
    {
      id: "SAL-MVP-08",
      milestone: "Deal Desk MVP",
      scope: "Show lightweight deal table with scenario/version placeholder, approval status, estimated payment label, and blocker state.",
      exitProof: "Deal desk visibility exists without quote submission or finance automation."
    },
    {
      id: "SAL-MVP-09",
      milestone: "Customer and appointment links",
      scope: "Link sales items to Customer 360, appointments, vehicles, and task records where available.",
      exitProof: "Users can move from sales console to source context without duplicate entry."
    },
    {
      id: "SAL-MVP-10",
      milestone: "Role and permission guardrails",
      scope: "Gate sensitive visibility and actions by role; show unavailable actions as planned or disabled.",
      exitProof: "Salesperson, manager, and admin views expose only appropriate information."
    },
    {
      id: "SAL-MVP-11",
      milestone: "MVP smoke and pilot readiness",
      scope: "Add route smoke, render smoke, auth/access smoke, and review checklist.",
      exitProof: "MVP passes tests and is ready for limited pilot review."
    },
    {
      id: "SAL-MVP-12",
      milestone: "Pilot review and stabilize",
      scope: "Run limited review with selected users, capture feedback, fix usability and data issues.",
      exitProof: "Pilot users agree console is stable enough for daily read-only use."
    }
  ]
} as const;

export type SalesConsoleMvpDefinition = typeof salesConsoleMvpDefinition;
