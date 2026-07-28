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
  recommendedMvpBoundary: {
    recommendation: "Launch the Sales Console MVP as a read-only command surface, not a transaction system.",
    releaseLine: "The MVP should help users see, prioritize, and investigate sales work; it should not yet send messages, submit quotes, reserve inventory, approve discounts, or make finance decisions.",
    pilotMode: "Limited pilot with selected salespeople, managers, and admin users using realistic data and disabled future-action controls.",
    successStandard: "A pilot user can open /sales, understand the most important sales work within 30 seconds, identify blockers, and move to the correct source record without duplicate entry.",
    expansionTrigger: "Only expand into write actions after data trust, role permissions, audit posture, and manager review workflows pass the decision gates.",
    nonNegotiables: [
      "Read-only first",
      "No high-risk sales actions",
      "Source records remain the system of record",
      "Blocked, stale, or placeholder data must be labeled",
      "Managers must see risk before sellers are asked to act",
      "Every MVP surface must have a future workflow path"
    ]
  },
  rolesAndPermissions: [
    {
      role: "Salesperson",
      canSee: [
        "Own daily work queue",
        "Assigned leads and customer context",
        "Matched inventory with readiness labels",
        "Own read-only deal status"
      ],
      cannotDo: [
        "Approve discounts",
        "Submit quotes",
        "Reserve vehicles",
        "Trigger automated customer messaging"
      ],
      mvpControl: "Default pilot role focused on visibility, prioritization, and source-record navigation."
    },
    {
      role: "Sales Manager",
      canSee: [
        "Team risk queues",
        "Approval placeholders",
        "Lead SLA health",
        "Deal desk visibility",
        "Forecast and top opportunities"
      ],
      cannotDo: [
        "Finalize discount approvals inside MVP",
        "Override finance outcomes",
        "Bypass data-quality warnings"
      ],
      mvpControl: "Manager role reviews risk and blockers first; write approvals remain future workflow."
    },
    {
      role: "BDC / Lead Coordinator",
      canSee: [
        "Lead intake health",
        "New, stale, unassigned, and duplicate-review leads",
        "Appointment signals",
        "Customer follow-up context"
      ],
      cannotDo: [
        "Change deal structure",
        "Reserve inventory",
        "Automate outbound messaging from the console"
      ],
      mvpControl: "Lead-operations visibility role for preventing leakage without creating new sales actions."
    },
    {
      role: "Admin / Owner",
      canSee: [
        "All MVP planning panels",
        "All pilot readiness indicators",
        "Role and data-source configuration status",
        "Future action placeholders"
      ],
      cannotDo: [
        "Turn on risky writes without a future release gate",
        "Treat placeholder data as production truth"
      ],
      mvpControl: "Administrative visibility for setup, review, and controlled expansion decisions."
    }
  ],
  dataSourceMap: [
    {
      surface: "Salesperson Today",
      source: "Existing task, lead, customer, appointment, and vehicle records",
      fields: "Customer, phone, vehicle, stage, next action, freshness, due state, blocker, reason",
      freshness: "Near-real-time or clearly timestamped",
      fallback: "Show placeholder, stale, or missing-data label instead of hiding risk."
    },
    {
      surface: "Lead Operations",
      source: "Lead intake, assignment, activity, duplicate-review, and appointment records",
      fields: "New leads, contacted count, SLA risk, unassigned leads, dedupe review, appointment count",
      freshness: "Same-day operational freshness",
      fallback: "Display lead-health unavailable state with source-owner note."
    },
    {
      surface: "Manager Command Center",
      source: "Aggregated sales queue, lead health, deal status, activity, and forecast placeholders",
      fields: "Risk queues, approvals-needed placeholders, delivery blockers, forecast, top opportunities",
      freshness: "Dashboard values must show last refreshed context when connected",
      fallback: "Keep cards visible with planned/placeholder labeling."
    },
    {
      surface: "Inventory Intelligence",
      source: "Vehicle inventory, readiness, availability, pricing, and customer-fit signals",
      fields: "Vehicle, stock number, match customer, fit score, status, blocker detail, price",
      freshness: "Availability and blocker fields must be current enough for showroom use",
      fallback: "Do not recommend as clean; show blocked, stale, or verify-first status."
    },
    {
      surface: "Deal Desk",
      source: "Deal records, scenario placeholders, payment labels, and approval status",
      fields: "Deal ID, customer, vehicle, scenario/version, estimated payment, approval state",
      freshness: "Read-only deal status should reflect latest trusted source state",
      fallback: "Show visibility-only placeholder; do not permit submission."
    },
    {
      surface: "Customer and source links",
      source: "Customer 360, appointment, task, vehicle, and deal source records",
      fields: "Stable IDs, source links, ownership, and context labels",
      freshness: "Links should resolve to current source records",
      fallback: "Disable broken links and label missing source context."
    }
  ],
  pilotAcceptanceChecklist: [
    {
      item: "Sales Console opens reliably",
      proof: "/sales route loads for authorized pilot users with clear loading and unavailable states.",
      owner: "Admin / technical owner"
    },
    {
      item: "Roles expose the right visibility",
      proof: "Salesperson, manager, BDC, and admin views show only appropriate MVP information.",
      owner: "Sales manager and admin"
    },
    {
      item: "Data is understandable and honest",
      proof: "Missing, stale, blocked, or placeholder records are labeled clearly instead of implied as trusted.",
      owner: "Sales operations"
    },
    {
      item: "Daily priorities are obvious",
      proof: "Pilot users can identify must-do-now work, blockers, and next source record within 30 seconds.",
      owner: "Pilot sales users"
    },
    {
      item: "No risky write actions are active",
      proof: "Messaging, quote submission, vehicle holds, finance decisions, and discount approvals remain disabled or planned.",
      owner: "Manager / owner"
    },
    {
      item: "Manager risk view is useful",
      proof: "Managers can see lead leakage, stale deals, approval placeholders, blockers, and top opportunities.",
      owner: "Sales manager"
    },
    {
      item: "Pilot feedback is captured",
      proof: "Review notes identify usability issues, missing fields, data concerns, and next release candidates.",
      owner: "Product / implementation owner"
    }
  ],
  includedInMvp: [
    {
      area: "Console shell and navigation",
      includes: [
        "Permanent /sales workspace entry",
        "Enterprise-style top navigation, search, alerts, and store context",
        "Sales-specific loading, unavailable, and protected-route states"
      ],
      outcome: "Users can reliably open the Sales Console and understand where sales work lives."
    },
    {
      area: "Salesperson Today",
      includes: [
        "Ranked seller queue",
        "Customer, vehicle, stage, next action, freshness, blocker, and reason fields",
        "Simple priority logic that surfaces must-do-now work first"
      ],
      outcome: "A salesperson can see the highest-priority work for the day without hunting across screens."
    },
    {
      area: "Lead Operations",
      includes: [
        "New lead visibility",
        "SLA-risk indicators",
        "Unassigned, stale, duplicate-review, and appointment health signals"
      ],
      outcome: "Managers and BDC users can spot lead leakage before it becomes lost opportunity."
    },
    {
      area: "Manager Command Center",
      includes: [
        "Risk queues",
        "Approvals-needed placeholders",
        "Delivery and activity blockers",
        "Forecast and top-opportunity summary cards"
      ],
      outcome: "Managers can see where attention is needed without waiting for end-of-day reporting."
    },
    {
      area: "Inventory Intelligence",
      includes: [
        "Vehicle-to-customer fit cards",
        "Readiness and availability status",
        "Visible blocker labels before a vehicle is recommended"
      ],
      outcome: "Sales teams can recommend inventory with confidence while avoiding blocked units."
    },
    {
      area: "Deal Desk visibility",
      includes: [
        "Read-only deal table",
        "Scenario and version labels",
        "Estimated payment display",
        "Approval and blocker status"
      ],
      outcome: "Teams can understand deal status without enabling quote submission or finance automation."
    },
    {
      area: "Customer and source-record links",
      includes: [
        "Links to customer context",
        "Links to appointments, vehicle records, and task records where available",
        "No duplicate-entry workflow in the MVP"
      ],
      outcome: "The console becomes a launchpad into trusted source records, not a second system of record."
    },
    {
      area: "Enterprise guardrails",
      includes: [
        "Role-aware visibility",
        "Disabled or planned states for sensitive future actions",
        "Smoke tests for render, route, and protected-state behavior"
      ],
      outcome: "The MVP is safe enough for pilot use and expandable without reworking the foundation."
    }
  ],
  excludedFromMvp: [
    {
      capability: "Customer messaging automation",
      reason: "Messaging creates compliance, consent, timing, and reputation risk before the sales console has proven its data quality.",
      futurePath: "Add after the console has trusted customer context, opt-in status, templates, audit history, and manager controls."
    },
    {
      capability: "Quote submission",
      reason: "Quote submission is a financial action, not just a display feature; it needs deal rules, lender logic, approvals, and audit trails.",
      futurePath: "Add after read-only Deal Desk visibility, scenario versioning, and manager approval workflows are stable."
    },
    {
      capability: "Vehicle holds or reservations",
      reason: "Holding inventory affects real store operations and can create customer conflict if availability data is not perfectly trusted.",
      futurePath: "Add after inventory readiness, availability, conflict rules, expiration policies, and permissions are validated."
    },
    {
      capability: "Finance decisions",
      reason: "Finance decisions require lender integrations, compliance review, identity controls, and strict auditability.",
      futurePath: "Keep finance as visibility-only first, then add controlled handoff workflows before any decision automation."
    },
    {
      capability: "Discount approvals",
      reason: "Discount approval changes gross profit and requires manager authority, pricing policy, exception rules, and traceable approval history.",
      futurePath: "Add after approval queues, role permissions, desk-manager workflows, and gross-impact reporting are proven."
    },
    {
      capability: "Full CRM replacement",
      reason: "The MVP should not become a second system of record or duplicate customer data before source-record links are reliable.",
      futurePath: "Expand only where the Sales Console improves daily workflow while still respecting the source systems."
    }
  ],
  buildOrder: [
    {
      step: "01",
      name: "Lock MVP scope and visual source of truth",
      deliverable: "Approved shell, included/excluded list, mockup reference, and pilot user assumptions.",
      dependency: "No dependency; this is the starting gate."
    },
    {
      step: "02",
      name: "Stabilize the /sales workspace",
      deliverable: "Protected route, navigation entry, loading/error states, responsive enterprise layout.",
      dependency: "Scope approval."
    },
    {
      step: "03",
      name: "Create the read-only data contract",
      deliverable: "Field map for seller queue, leads, deals, inventory, manager rail, and source-record links.",
      dependency: "Stable shell so data fields have a visible destination."
    },
    {
      step: "04",
      name: "Build Salesperson Today",
      deliverable: "Ranked daily work queue with priority, freshness, blocker, and next-action logic.",
      dependency: "Data contract for tasks, customers, leads, appointments, and vehicle context."
    },
    {
      step: "05",
      name: "Build Lead Operations and Manager Command Center",
      deliverable: "Lead health, SLA risk, risk queues, approvals placeholders, forecast placeholders, and top opportunities.",
      dependency: "Salesperson queue logic plus lead and activity signals."
    },
    {
      step: "06",
      name: "Build Inventory Intelligence and Deal Desk visibility",
      deliverable: "Vehicle-fit cards, readiness blockers, read-only deal rows, payment labels, approval states.",
      dependency: "Vehicle availability fields and deal/status placeholders."
    },
    {
      step: "07",
      name: "Pilot, measure, and stabilize",
      deliverable: "Smoke tests, pilot checklist, feedback fixes, and go/no-go review for daily read-only use.",
      dependency: "All MVP surfaces render correctly with realistic data and safe permissions."
    }
  ],
  decisionGates: [
    {
      gate: "Gate 1: Scope approval",
      question: "Do the included and excluded MVP boundaries match Time Motor Sales' first usable version?",
      passSignal: "Stakeholders approve the MVP scope without adding risky writes.",
      ifNotPassed: "Revise scope before implementation continues."
    },
    {
      gate: "Gate 2: Visual approval",
      question: "Does the built console match the approved enterprise mockup closely enough for daily review?",
      passSignal: "Navigation, density, command rail, deal desk, and inventory sections feel enterprise-grade.",
      ifNotPassed: "Pause feature expansion and correct the UI foundation first."
    },
    {
      gate: "Gate 3: Data trust",
      question: "Are the source fields clear, fresh enough, and labeled honestly when missing or stale?",
      passSignal: "Users can tell which records are trusted, stale, blocked, or placeholder-only.",
      ifNotPassed: "Keep the console in admin review mode and fix the data contract."
    },
    {
      gate: "Gate 4: Safety and permissions",
      question: "Can users see useful work without being able to trigger high-risk sales actions?",
      passSignal: "Sensitive actions are hidden, disabled, or clearly marked as future workflow.",
      ifNotPassed: "Block pilot release until role and action guardrails are corrected."
    },
    {
      gate: "Gate 5: Daily usefulness",
      question: "Can a salesperson or manager understand their priorities within 30 seconds?",
      passSignal: "Pilot users can identify top work, blockers, and next steps without coaching.",
      ifNotPassed: "Simplify ranking, labels, and layout before adding more features."
    },
    {
      gate: "Gate 6: Expansion readiness",
      question: "Can the MVP expand into workflows later without replacing the foundation?",
      passSignal: "Current sections map cleanly to future approvals, messaging, finance handoff, and reporting.",
      ifNotPassed: "Refactor the foundation before merging into the main sales console path."
    }
  ],
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
