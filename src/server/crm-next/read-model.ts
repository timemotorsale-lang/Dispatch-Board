import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";

export type CrmNextAttentionLevel = "High" | "Medium" | "Low";
export type CrmNextMilestoneStatus =
  | "PLANNED"
  | "CONTRACTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED_UNVERIFIED"
  | "VERIFIED"
  | "HELD"
  | "DEFERRED";

export type CrmNextMilestoneProgress = {
  id: string;
  title: string;
  status: CrmNextMilestoneStatus;
  objective: string;
  reviewHref: string;
  evidence: string;
  safety: string;
};

export type CrmNextAttentionItem = {
  id: string;
  customerId: string;
  customerName: string;
  reason: string;
  age: string;
  area: "Sales" | "Finance" | "Service" | "Support";
  owner: string;
  level: CrmNextAttentionLevel;
  nextAction: string;
  workHref: string;
  customerHref: string;
};

export type CrmNextCustomer360 = {
  id: string;
  name: string;
  status: "Active";
  phone: string;
  email: string;
  address: string;
  customerSince: string;
  lifetimeValue: string;
  vehiclesOwned: number;
  openDeals: number;
  openCases: number;
  riskLevel: CrmNextAttentionLevel;
  nextAction: string;
  vehicles: Array<{ id: string; label: string; vin: string; status: string }>;
  glance: Array<{ label: string; value: string; href: string }>;
  communications: Array<{ id: string; channel: "Phone" | "Text" | "Email" | "Appointment"; detail: string; occurredAt: string }>;
};

export type CrmNextSearchGroup = {
  id: string;
  label: string;
  description: string;
  href: string;
  count: number;
  safety: string;
};

export type CrmNextTimelineEvent = {
  id: string;
  source: "Customer" | "Communication" | "Opportunity" | "Appointment" | "Dispatch" | "Vehicle" | "Finance" | "Support" | "Insurance";
  label: string;
  detail: string;
  occurredAt: string;
  href: string;
};

export type CrmNextSalesRecord = {
  id: string;
  customerName: string;
  vehicle: string;
  amount: string;
  stage: string;
  owner: string;
  nextAction: string;
  href: string;
};

export type CrmNextOwnershipSupportRecord = {
  id: string;
  domain: "Vehicle" | "Finance" | "Payment" | "Case" | "Title/Document" | "Service" | "Rental/Loaner" | "Customer Issue" | "Insurance";
  title: string;
  status: string;
  priority: CrmNextAttentionLevel;
  owner: string;
  nextAction: string;
  href: string;
  permission: "Open" | "Restricted" | "Held";
  sourceOfTruth: string;
};

export type CrmNextSharedExecutionRecord = {
  id: string;
  milestone: "CRMN-050" | "CRMN-051" | "CRMN-052" | "CRMN-053" | "CRMN-054";
  title: string;
  state: "Preview only" | "Read-only" | "Manager review";
  description: string;
  sourceSystem: string;
  crmNextSurface: string;
  dispatchSurface: string;
  safety: string;
  href: string;
};

export type CrmNextIntelligenceRecord = {
  id: string;
  milestone: "CRMN-060" | "CRMN-061" | "CRMN-062" | "CRMN-063" | "CRMN-064" | "CRMN-065" | "CRMN-066" | "CRMN-067";
  kind: "Signal" | "Risk" | "Next Action" | "Opportunity" | "Priority" | "Queue" | "Feedback" | "Manager Intelligence";
  title: string;
  confidence: "Explainable" | "Needs review" | "Human decides";
  signal: string;
  recommendation: string;
  explanation: string;
  sourceSystem: string;
  safety: string;
  href: string;
};

export type CrmNextCommandCenterMode = {
  id: string;
  milestone: "CRMN-068" | "CRMN-069" | "CRMN-070" | "CRMN-071" | "CRMN-072" | "CRMN-073" | "CRMN-074";
  audience: "All staff" | "Employee" | "Manager";
  title: string;
  state: "Review ready" | "Preview only" | "Held";
  objective: string;
  primaryMetric: string;
  secondaryMetric: string;
  guidance: string;
  href: string;
};

export type CrmNextCommandCenter = {
  contractVersion: "crm-next-command-center/v1";
  generatedAt: string;
  userName: string;
  mode: "REVIEW";
  summary: Array<{ label: string; value: string; trend: string; tone: "blue" | "green" | "red" }>;
  attention: CrmNextAttentionItem[];
  pipeline: Array<{ label: string; value: number }>;
  revenue: { monthToDate: string; trend: string };
  nextActions: Array<{ id: string; label: string; detail: string; impact: CrmNextAttentionLevel; href: string }>;
  customers: CrmNextCustomer360[];
  search: { queryPlaceholder: string; groups: CrmNextSearchGroup[] };
  timeline: CrmNextTimelineEvent[];
  sales: {
    leads: CrmNextSalesRecord[];
    opportunities: CrmNextSalesRecord[];
    appointments: CrmNextSalesRecord[];
    testDrives: CrmNextSalesRecord[];
    deals: CrmNextSalesRecord[];
  };
  ownershipSupport: CrmNextOwnershipSupportRecord[];
  sharedExecution: CrmNextSharedExecutionRecord[];
  intelligence: CrmNextIntelligenceRecord[];
  commandCenter: {
    headline: string;
    guidance: string;
    modes: CrmNextCommandCenterMode[];
  };
  bridge: {
    liveTaskCreationEnabled: false;
    previewEnabled: true;
    message: string;
  };
  progress: {
    completedCount: number;
    envelopeCount: number;
    verifiedCount: number;
    heldCount: number;
    nextMilestone: string;
    milestones: CrmNextMilestoneProgress[];
  };
};

const progressMilestones: CrmNextMilestoneProgress[] = [
  {
    id: "CRMN-010",
    title: "CRM Next shell and feature flag",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Open CRM Next at /crm-next only when CRM_NEXT is enabled.",
    reviewHref: "/crm-next",
    evidence: "Route, feature flag access guard, fail-closed fallback, and Legacy links are implemented.",
    safety: "No Legacy route replacement and no customer writes."
  },
  {
    id: "CRMN-011",
    title: "Command Center layout",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Use the approved mockup as a simple command center baseline.",
    reviewHref: "/crm-next",
    evidence: "Attention cards, pipeline summary, revenue summary, and next-action cards render in review mode.",
    safety: "Read-model only; no operational metrics are claimed live."
  },
  {
    id: "CRMN-012",
    title: "Needs Attention queue",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give users one clear queue of customers that need action.",
    reviewHref: "/crm-next/needs-attention",
    evidence: "Prioritized review rows open Work Customer/Attend Mode.",
    safety: "Queue is review data until live signal sources are approved."
  },
  {
    id: "CRMN-013",
    title: "Customer 360 overview",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show customer, vehicle, opportunity, communication, and next-action context in one place.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 page renders the approved overview pattern.",
    safety: "Customer profile is review-only and links back to Legacy/current CRM."
  },
  {
    id: "CRMN-014",
    title: "Work Customer / Attend Mode",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make customer work feel like a simple action screen, not a database record.",
    reviewHref: "/crm-next/work/attn-michael-overdue-follow-up",
    evidence: "Work Customer screen shows action cards, suggested next action, and customer context.",
    safety: "Sensitive payment/document paths explain held status instead of executing."
  },
  {
    id: "CRMN-015",
    title: "Action-to-task dispatch bridge",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Preview how CRM actions become Dispatch Board tasks later.",
    reviewHref: "/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview",
    evidence: "Bridge contract returns preview shape with liveTaskCreated=false.",
    safety: "No Dispatch Board task is created."
  },
  {
    id: "CRMN-016",
    title: "Visible implementation progress",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show the build status and next 20-milestone envelope in CRM Next itself.",
    reviewHref: "/crm-next/progress",
    evidence: "Progress board is available at /crm-next/progress as the review cockpit.",
    safety: "Status uses approved vocabulary and does not overstate completion."
  },
  {
    id: "CRMN-017",
    title: "UX baseline navigation polish",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make CRM Next navigation obvious across Command Center, Customer 360, Work Customer, and Progress.",
    reviewHref: "/crm-next",
    evidence: "Primary navigation, search entry, Legacy/current CRM fallback links, and progress review links are wired.",
    safety: "Navigation-only; no writes."
  },
  {
    id: "CRMN-018",
    title: "Safe global search shell",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Create the search experience before connecting live sources.",
    reviewHref: "/crm-next/search",
    evidence: "Search review page renders grouped source areas with safe fallback links.",
    safety: "No broad data exposure until policies are connected."
  },
  {
    id: "CRMN-019",
    title: "Grouped search results",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Group results by customer, vehicle, deal, communication, and work.",
    reviewHref: "/crm-next/search",
    evidence: "Customer, vehicle, deal, communication, and work result groups are visible in CRM Next review mode.",
    safety: "Permission filtering required before real data."
  },
  {
    id: "CRMN-020",
    title: "Dynamic customer overview",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show the most relevant customer situation without hiding the full record.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 includes a context summary, next action, customer facts, timeline, and fallback work links.",
    safety: "Read-only prominence rules."
  },
  {
    id: "CRMN-021",
    title: "70/30 Workbench refinement",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Refine Work Customer into a focused execution pane plus context rail.",
    reviewHref: "/crm-next/work/attn-michael-overdue-follow-up",
    evidence: "Attend Mode keeps the work area focused while context and fallback tools stay one click away.",
    safety: "No live actions without bridge approval."
  },
  {
    id: "CRMN-022",
    title: "Universal action bar",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Standardize Call, Text, Email, Appointment, Task, and More controls.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Reusable action bar appears in Customer 360 and Attend Mode with safe communication and task destinations.",
    safety: "Disabled/preview actions must explain why."
  },
  {
    id: "CRMN-023",
    title: "Open-items context rail",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Summarize open cases, deals, appointments, documents, and dispatch work.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 context rail exposes open deals, cases, appointments, vehicles, risk, and next action.",
    safety: "Source-of-truth boundaries preserved."
  },
  {
    id: "CRMN-024",
    title: "Activity interaction read model",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare a unified timeline without creating duplicate source records.",
    reviewHref: "/crm-next/timeline",
    evidence: "Unified timeline review surface shows source-linked customer, communication, opportunity, appointment, and dispatch events.",
    safety: "Timeline events stay source-linked."
  },
  {
    id: "CRMN-025",
    title: "Responsive/mobile behavior",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make the review flow usable on tablet/mobile.",
    reviewHref: "/crm-next",
    evidence: "CRM Next grids, rows, action cards, and progress cockpit collapse for smaller screens.",
    safety: "No horizontal overflow or buried primary actions."
  },
  {
    id: "CRMN-026",
    title: "Empty/loading/error states",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make every blocked or missing state explain what the user can do next.",
    reviewHref: "/crm-next/system/states",
    evidence: "State review page documents empty, loading, blocked, and unavailable behavior with safe next steps.",
    safety: "No private error/data leakage."
  },
  {
    id: "CRMN-027",
    title: "Permission-denied surfaces",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show safe denial states for unauthorized users.",
    reviewHref: "/crm-next/system/permissions",
    evidence: "Permission review surface explains fail-closed behavior and points users back to approved workspaces.",
    safety: "Fail closed."
  },
  {
    id: "CRMN-028",
    title: "Legacy switch/fallback links",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make switching between CRM Next and Legacy/current CRM obvious during pilot.",
    reviewHref: "/crm-next",
    evidence: "CRM Next sidebar, unavailable state, progress cockpit, and work views include Legacy/current CRM exits.",
    safety: "Legacy remains operational."
  },
  {
    id: "CRMN-029",
    title: "Route and rollback proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove CRM Next can be disabled without harming existing workspaces.",
    reviewHref: "/crm-next/system/rollback",
    evidence: "Rollback review page and access tests cover CRM_NEXT off behavior.",
    safety: "CRM_NEXT off returns to safe workspaces."
  },
  {
    id: "CRMN-030",
    title: "Lead/opportunity read adapters",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare lead and opportunity read models for CRM Next.",
    reviewHref: "/crm-next/pipeline",
    evidence: "Sales read-model sections expose leads and opportunities for review-safe CRM Next pages.",
    safety: "Read-only until lifecycle approvals."
  },
  {
    id: "CRMN-031",
    title: "Pipeline read-only board",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show a real governed pipeline review surface.",
    reviewHref: "/crm-next/pipeline",
    evidence: "Pipeline board renders lead/opportunity rows, stages, amounts, owners, and next actions without mutation.",
    safety: "No stage mutation."
  },
  {
    id: "CRMN-032",
    title: "Appointments integration",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Surface appointment context from the existing appointment workspace.",
    reviewHref: "/crm-next/appointments",
    evidence: "Appointments review surface links CRM Next context back to the existing appointment workspace.",
    safety: "Appointment source remains authoritative."
  },
  {
    id: "CRMN-033",
    title: "Test-drive review surface",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose test-drive context in Customer 360 and Work Customer.",
    reviewHref: "/crm-next/test-drives",
    evidence: "Test-drive review rows show customer, vehicle, owner, and next step as read-only review data.",
    safety: "Review-only until test-drive commands are approved."
  },
  {
    id: "CRMN-034",
    title: "Deal review surface",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show deal state, amount, owner, and next action clearly.",
    reviewHref: "/crm-next/deals",
    evidence: "Deal review surface shows deal state, value, owner, and next action without changing the source record.",
    safety: "No deal mutation."
  },
  {
    id: "CRMN-035",
    title: "Sales timeline events",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Add sales events to the unified customer timeline.",
    reviewHref: "/crm-next/timeline",
    evidence: "Sales and opportunity events appear in the unified timeline as source-linked read-only events.",
    safety: "Events remain source-linked and read-only."
  },
  {
    id: "CRMN-040",
    title: "Vehicle relationships",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show customer vehicle relationships without creating a second vehicle master.",
    reviewHref: "/crm-next/ownership-support",
    evidence: "Ownership/support surface includes source-linked vehicle relationship cards and vehicle workspace fallback.",
    safety: "Vehicle workspace remains authoritative; CRM Next is read-only."
  },
  {
    id: "CRMN-041",
    title: "BHPH/finance context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show finance context only through permission-aware review surfaces.",
    reviewHref: "/crm-next/ownership-support#finance",
    evidence: "Finance context is visible as restricted summary with held execution copy.",
    safety: "No accounting ledger or finance writes are introduced."
  },
  {
    id: "CRMN-042",
    title: "Payment context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Surface payment due/overdue context as customer attention without processing payments.",
    reviewHref: "/crm-next/ownership-support#payment",
    evidence: "Payment context appears as a high-priority review card and timeline signal.",
    safety: "Payment collection remains held."
  },
  {
    id: "CRMN-043",
    title: "Common Case framework",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Use one common support case pattern for customer issues, titles, service, insurance, payments, and rentals.",
    reviewHref: "/crm-next/ownership-support#cases",
    evidence: "Common case cards share domain, status, priority, owner, next action, and source-of-truth fields.",
    safety: "No duplicate case universe is created."
  },
  {
    id: "CRMN-044",
    title: "Titles/documents",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make document/title needs visible and actionable without enabling sending/uploading.",
    reviewHref: "/crm-next/ownership-support#documents",
    evidence: "Document/title review card shows status, owner, next action, and held document execution.",
    safety: "Document actions remain permission-gated and held."
  },
  {
    id: "CRMN-045",
    title: "Service",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show service/repair context in Customer 360 while repair workflows remain authoritative.",
    reviewHref: "/crm-next/ownership-support#service",
    evidence: "Service support card links customer context to existing service/repair ownership.",
    safety: "No repair workflow replacement."
  },
  {
    id: "CRMN-046",
    title: "Rentals/loaners",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose loaner/rental status and due-back risk in the support context.",
    reviewHref: "/crm-next/ownership-support#rental",
    evidence: "Rental/loaner card shows due-back attention and owner.",
    safety: "No rental contract mutation."
  },
  {
    id: "CRMN-047",
    title: "Customer issues",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Surface customer complaints and issue resolution as common cases.",
    reviewHref: "/crm-next/ownership-support#issues",
    evidence: "Customer issue card uses the common case pattern with severity and next action.",
    safety: "No issue closure or escalation writes."
  },
  {
    id: "CRMN-048",
    title: "Insurance",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose insurance claim context with restricted sensitive detail.",
    reviewHref: "/crm-next/ownership-support#insurance",
    evidence: "Insurance card shows claim status, document need, owner, and safe next action.",
    safety: "Insurance detail remains permission-aware and read-only."
  },
  {
    id: "CRMN-050",
    title: "CRM-to-shared-task linkage",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare CRM actions to map to the shared Dispatch Board task engine without creating duplicate tasks.",
    reviewHref: "/crm-next/shared-execution",
    evidence: "Shared execution surface documents preview-only CRM action to shared task linkage.",
    safety: "No live task creation; shared task engine remains authoritative."
  },
  {
    id: "CRMN-051",
    title: "Dispatch Board customer context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show how Dispatch Board work can retain customer context from CRM Next.",
    reviewHref: "/crm-next/shared-execution#dispatch-context",
    evidence: "Dispatch customer-context bridge is represented with CRM and Dispatch source links.",
    safety: "Dispatch Board routes and task ownership remain unchanged."
  },
  {
    id: "CRMN-052",
    title: "Comments/blockers/review synchronization",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Keep comments, blockers, and review state source-linked instead of copied.",
    reviewHref: "/crm-next/shared-execution#sync",
    evidence: "Shared execution surface shows synchronized read-only state for comments, blockers, and review.",
    safety: "No duplicate comment/blocker store."
  },
  {
    id: "CRMN-053",
    title: "Task activity integration",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare task activity to appear in Customer 360 timeline as source-linked events.",
    reviewHref: "/crm-next/shared-execution#activity",
    evidence: "Task activity bridge is represented as a read-only Customer 360 timeline feed.",
    safety: "Activity remains event-backed and source-owned."
  },
  {
    id: "CRMN-054",
    title: "Manager queue",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give managers a queue for unassigned, overdue, blocked, escalated, or review-needed customer work.",
    reviewHref: "/crm-next/shared-execution#manager-queue",
    evidence: "Manager queue review cards show exception class, owner, destination, and safe action.",
    safety: "No reassignment or escalation mutation."
  },
  {
    id: "CRMN-060",
    title: "Intelligence signal foundation",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Represent reusable customer, task, deal, and activity signals without autonomous execution.",
    reviewHref: "/crm-next/intelligence-foundation",
    evidence: "Intelligence foundation surface shows explainable signal cards and their source systems.",
    safety: "Signals are advisory and read-only."
  },
  {
    id: "CRMN-061",
    title: "Risk scoring posture",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show risk explanations that staff can review before taking action.",
    reviewHref: "/crm-next/intelligence-foundation#risk",
    evidence: "Risk card includes visible inputs and human decision copy.",
    safety: "No hidden customer classification or automatic account change."
  },
  {
    id: "CRMN-062",
    title: "Next-best-action foundation",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Recommend the next safe action with plain-language explanation.",
    reviewHref: "/crm-next/intelligence-foundation#next-action",
    evidence: "Next-action card explains recommendation, source signal, and held execution boundary.",
    safety: "No call, text, email, task, or deal mutation is triggered automatically."
  },
  {
    id: "CRMN-063",
    title: "Opportunity intelligence",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose opportunity value signals without changing pipeline stages.",
    reviewHref: "/crm-next/intelligence-foundation#opportunity",
    evidence: "Opportunity signal card links review value to the pipeline surface.",
    safety: "Pipeline remains read-only."
  },
  {
    id: "CRMN-064",
    title: "Priority rules",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make queue ordering understandable by showing the rule inputs.",
    reviewHref: "/crm-next/intelligence-foundation#priority",
    evidence: "Priority card explains why one item rises above another.",
    safety: "No invisible reprioritization of Dispatch Board work."
  },
  {
    id: "CRMN-065",
    title: "Needs Attention intelligence",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Connect intelligence to the Needs Attention queue while keeping human review.",
    reviewHref: "/crm-next/intelligence-foundation#needs-attention",
    evidence: "Needs Attention card explains queue source, reason, and review path.",
    safety: "Queue remains a review surface."
  },
  {
    id: "CRMN-066",
    title: "Feedback loop foundation",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare staff feedback categories for improving recommendations later.",
    reviewHref: "/crm-next/intelligence-foundation#feedback",
    evidence: "Feedback card defines why staff can accept, skip, correct, or escalate a recommendation.",
    safety: "No model training, customer mutation, or automatic preference change occurs in this slice."
  },
  {
    id: "CRMN-067",
    title: "Manager intelligence cockpit",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give managers explainable visibility into risk, opportunity, overdue, and blocked customer work.",
    reviewHref: "/crm-next/intelligence-foundation#manager-intelligence",
    evidence: "Manager intelligence card links escalations to manager review without live overrides.",
    safety: "No manager override or reassignment command is enabled."
  },
  {
    id: "CRMN-068",
    title: "Review UX completion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make CRM Next review pages feel like a compact enterprise console instead of a prototype.",
    reviewHref: "/crm-next",
    evidence: "Command Center includes compact direction, review state, and navigation to safe work surfaces.",
    safety: "No operational behavior is enabled."
  },
  {
    id: "CRMN-069",
    title: "Review state labels",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show staff what is review-ready, preview-only, or held before they click.",
    reviewHref: "/crm-next",
    evidence: "Command Center mode cards expose state labels and guidance.",
    safety: "Held items remain non-operational."
  },
  {
    id: "CRMN-070",
    title: "Employee Command Center",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give staff a simple work-first Command Center view.",
    reviewHref: "/crm-next#employee-command-center",
    evidence: "Employee command card summarizes next customer work and linked action path.",
    safety: "Employee actions are still review/preview only."
  },
  {
    id: "CRMN-071",
    title: "Manager Command Center",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give managers compact visibility into load, risk, and blocked customer work.",
    reviewHref: "/crm-next#manager-command-center",
    evidence: "Manager command card summarizes risk, blocked work, and review path.",
    safety: "No manager override or reassignment mutation."
  },
  {
    id: "CRMN-072",
    title: "Appointments/work summary",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Summarize appointment and work obligations without replacing owning systems.",
    reviewHref: "/crm-next#appointments-work-summary",
    evidence: "Appointments/work summary card links to CRM Next appointment and task bridge surfaces.",
    safety: "Appointments and tasks remain source-owned."
  },
  {
    id: "CRMN-073",
    title: "Pipeline/intelligence summaries",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show pipeline and intelligence context side-by-side for daily review.",
    reviewHref: "/crm-next#pipeline-intelligence-summary",
    evidence: "Pipeline/intelligence summary card links to read-only pipeline and intelligence surfaces.",
    safety: "No stage movement or AI execution."
  },
  {
    id: "CRMN-074",
    title: "Team response/load indicators",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose response pressure and team load without changing assignments.",
    reviewHref: "/crm-next#team-load-indicators",
    evidence: "Team load card shows response posture and manager review guidance.",
    safety: "No invisible reprioritization, reassignment, or escalation."
  }
];

const attentionItems: CrmNextAttentionItem[] = [
  {
    id: "attn-michael-overdue-follow-up",
    customerId: "michael-johnson",
    customerName: "Michael Johnson",
    reason: "Overdue follow-up",
    age: "2h",
    area: "Sales",
    owner: "John Smith",
    level: "High",
    nextAction: "Call Michael Johnson",
    workHref: "/crm-next/work/attn-michael-overdue-follow-up",
    customerHref: "/crm-next/customers/michael-johnson"
  },
  {
    id: "attn-sarah-payment",
    customerId: "sarah-williams",
    customerName: "Sarah Williams",
    reason: "Payment overdue",
    age: "4h",
    area: "Finance",
    owner: "Lisa Jones",
    level: "High",
    nextAction: "Send payment reminder",
    workHref: "/crm-next/work/attn-sarah-payment",
    customerHref: "/crm-next/customers/sarah-williams"
  },
  {
    id: "attn-david-title",
    customerId: "david-brown",
    customerName: "David Brown",
    reason: "Title pending",
    age: "1d",
    area: "Sales",
    owner: "Mark Davis",
    level: "Medium",
    nextAction: "Review title status",
    workHref: "/crm-next/work/attn-david-title",
    customerHref: "/crm-next/customers/david-brown"
  },
  {
    id: "attn-jessica-service",
    customerId: "jessica-davis",
    customerName: "Jessica Davis",
    reason: "Service due",
    age: "1d",
    area: "Service",
    owner: "Tom Wilson",
    level: "Medium",
    nextAction: "Schedule service",
    workHref: "/crm-next/work/attn-jessica-service",
    customerHref: "/crm-next/customers/jessica-davis"
  },
  {
    id: "attn-robert-insurance",
    customerId: "robert-miller",
    customerName: "Robert Miller",
    reason: "Insurance claim update",
    age: "2d",
    area: "Support",
    owner: "John Smith",
    level: "Low",
    nextAction: "Send insurance follow-up",
    workHref: "/crm-next/work/attn-robert-insurance",
    customerHref: "/crm-next/customers/robert-miller"
  }
];

const customers: CrmNextCustomer360[] = [
  {
    id: "michael-johnson",
    name: "Michael Johnson",
    status: "Active",
    phone: "(817) 555-0198",
    email: "michael.johnson@email.com",
    address: "1234 Maple St, Fort Worth, TX 76107",
    customerSince: "Jan 15, 2022",
    lifetimeValue: "$38,650",
    vehiclesOwned: 2,
    openDeals: 1,
    openCases: 2,
    riskLevel: "Medium",
    nextAction: "Call Michael about overdue follow-up.",
    vehicles: [
      { id: "veh-rav4", label: "2021 Toyota RAV4 XLE", vin: "2T3P1RFV0LW123456", status: "Owned" },
      { id: "veh-f150", label: "2018 Ford F-150 XLT", vin: "1FTEW1CPXJKD12345", status: "Owned" }
    ],
    glance: [
      { label: "Next appointment", value: "May 16, 2025 · 10:00 AM", href: "/appointments" },
      { label: "Next payment due", value: "May 20, 2025 · $487.32", href: "/crm-next#finance-held" },
      { label: "Current opportunity", value: "Vehicle upgrade", href: "/crm-next#pipeline" }
    ],
    communications: [
      { id: "comm-phone-1", channel: "Phone", detail: "Spoke with customer about title status.", occurredAt: "May 12, 2025" },
      { id: "comm-text-1", channel: "Text", detail: "Sent payment reminder.", occurredAt: "May 10, 2025" },
      { id: "comm-email-1", channel: "Email", detail: "Sent insurance documents.", occurredAt: "May 8, 2025" },
      { id: "comm-appt-1", channel: "Appointment", detail: "Test drove 2021 Toyota RAV4.", occurredAt: "May 2, 2025" }
    ]
  }
];

const searchGroups: CrmNextSearchGroup[] = [
  {
    id: "search-customers",
    label: "Customers",
    description: "Find the customer profile, open Customer 360, and continue into Attend Mode.",
    href: "/crm-next/customers/michael-johnson",
    count: 1,
    safety: "Customer records are review-only in CRM Next."
  },
  {
    id: "search-vehicles",
    label: "Vehicles",
    description: "Connect vehicle ownership context without replacing the existing vehicle source.",
    href: "/vehicles",
    count: 2,
    safety: "Vehicle workspace remains authoritative."
  },
  {
    id: "search-deals",
    label: "Deals and Opportunities",
    description: "Review deal value, stage, owner, and next action from the sales read model.",
    href: "/crm-next/deals",
    count: 3,
    safety: "No deal mutation from CRM Next yet."
  },
  {
    id: "search-communications",
    label: "Communications",
    description: "Review recent phone, text, email, and appointment history before live channels are connected.",
    href: "/crm-next/timeline",
    count: 4,
    safety: "Live calling, texting, and email sending remain held."
  },
  {
    id: "search-work",
    label: "Connected Work",
    description: "Jump to Dispatch Board tasks, appointments, cases, and customer work surfaces.",
    href: "/crm-next/work/attn-michael-overdue-follow-up",
    count: 5,
    safety: "Dispatch task creation is preview-only."
  }
];

const timelineEvents: CrmNextTimelineEvent[] = [
  {
    id: "timeline-opportunity-proposal",
    source: "Opportunity",
    label: "Opportunity moved to proposal review",
    detail: "Michael Johnson is reviewing a vehicle upgrade opportunity.",
    occurredAt: "Today · 8:10 PM",
    href: "/crm-next/deals"
  },
  {
    id: "timeline-call",
    source: "Communication",
    label: "Phone follow-up recorded",
    detail: "Spoke with customer about title status and next appointment.",
    occurredAt: "May 12, 2025",
    href: "/crm-next/work/attn-michael-overdue-follow-up"
  },
  {
    id: "timeline-appointment",
    source: "Appointment",
    label: "Appointment scheduled",
    detail: "Next visit is visible from CRM Next but remains owned by the appointment workspace.",
    occurredAt: "May 16, 2025 · 10:00 AM",
    href: "/crm-next/appointments"
  },
  {
    id: "timeline-dispatch",
    source: "Dispatch",
    label: "Dispatch bridge preview prepared",
    detail: "CRM action can be converted into a future Dispatch Board task after approval.",
    occurredAt: "Review mode",
    href: "/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview"
  }
];

const salesRecords: CrmNextSalesRecord[] = [
  {
    id: "sales-michael-upgrade",
    customerName: "Michael Johnson",
    vehicle: "2021 Toyota RAV4 XLE",
    amount: "$248,500",
    stage: "Proposal Review",
    owner: "John Smith",
    nextAction: "Call customer and confirm upgrade interest.",
    href: "/crm-next/work/attn-michael-overdue-follow-up"
  },
  {
    id: "sales-sarah-trade",
    customerName: "Sarah Williams",
    vehicle: "Trade-in + upgrade",
    amount: "$18,500",
    stage: "Qualified",
    owner: "Lisa Jones",
    nextAction: "Send payment reminder before deal review.",
    href: "/crm-next/work/attn-sarah-payment"
  },
  {
    id: "sales-david-test-drive",
    customerName: "David Brown",
    vehicle: "2021 Toyota RAV4",
    amount: "$22,750",
    stage: "Test Drive",
    owner: "Mark Davis",
    nextAction: "Schedule test drive and prepare vehicle.",
    href: "/crm-next/test-drives"
  }
];

const ownershipSupportRecords: CrmNextOwnershipSupportRecord[] = [
  {
    id: "ownership-vehicle-rav4",
    domain: "Vehicle",
    title: "2021 Toyota RAV4 XLE · owned vehicle relationship",
    status: "Active ownership relationship",
    priority: "Low",
    owner: "Sales",
    nextAction: "Open the vehicle workspace if deeper inventory/service context is needed.",
    href: "/vehicles",
    permission: "Open",
    sourceOfTruth: "Vehicle and CustomerVehicle records"
  },
  {
    id: "ownership-finance-bhph",
    domain: "Finance",
    title: "BHPH / finance context",
    status: "Restricted summary",
    priority: "Medium",
    owner: "Finance",
    nextAction: "Manager or finance user reviews account context before any payment action.",
    href: "#finance",
    permission: "Restricted",
    sourceOfTruth: "Finance/accounting source; CRM Next shows context only"
  },
  {
    id: "ownership-payment-due",
    domain: "Payment",
    title: "Payment due May 20 · $487.32",
    status: "Due soon",
    priority: "High",
    owner: "Lisa Jones",
    nextAction: "Send approved reminder after communication/payment policy is enabled.",
    href: "#payment",
    permission: "Held",
    sourceOfTruth: "Payment source; no payment processing in CRM Next"
  },
  {
    id: "support-case-title",
    domain: "Case",
    title: "Common support case framework",
    status: "Contract-ready",
    priority: "Medium",
    owner: "Support",
    nextAction: "Use one case pattern for title, service, insurance, payment, rental, and customer issue work.",
    href: "#cases",
    permission: "Open",
    sourceOfTruth: "ConcernCase common case framework"
  },
  {
    id: "support-title-document",
    domain: "Title/Document",
    title: "Title document pending",
    status: "Open case",
    priority: "Medium",
    owner: "Mark Davis",
    nextAction: "Verify title status and record the source workspace update.",
    href: "#documents",
    permission: "Restricted",
    sourceOfTruth: "CustomerDocumentRequirement / title workflow"
  },
  {
    id: "support-service-open",
    domain: "Service",
    title: "Service follow-up due",
    status: "Open support context",
    priority: "Medium",
    owner: "Tom Wilson",
    nextAction: "Open repair/service workspace for authoritative repair action.",
    href: "/vehicles/repair-orders",
    permission: "Open",
    sourceOfTruth: "ServiceVisit / RepairOrder"
  },
  {
    id: "support-rental-loaner",
    domain: "Rental/Loaner",
    title: "Loaner due-back check",
    status: "Review needed",
    priority: "Low",
    owner: "Support",
    nextAction: "Confirm due-back plan with the assigned owner.",
    href: "#rental",
    permission: "Held",
    sourceOfTruth: "Rental/loaner source when connected"
  },
  {
    id: "support-customer-issue",
    domain: "Customer Issue",
    title: "Customer complaint follow-up",
    status: "Open common case",
    priority: "High",
    owner: "Manager Review",
    nextAction: "Attend the customer and record the resolution outcome.",
    href: "#issues",
    permission: "Open",
    sourceOfTruth: "ConcernCase common case framework"
  },
  {
    id: "support-insurance-claim",
    domain: "Insurance",
    title: "Insurance claim update requested",
    status: "Waiting on document confirmation",
    priority: "Low",
    owner: "John Smith",
    nextAction: "Review claim status and confirm next document requirement.",
    href: "#insurance",
    permission: "Restricted",
    sourceOfTruth: "Insurance claim source / document case"
  }
];

const sharedExecutionRecords: CrmNextSharedExecutionRecord[] = [
  {
    id: "shared-task-linkage",
    milestone: "CRMN-050",
    title: "CRM action → shared Dispatch task",
    state: "Preview only",
    description: "A CRM action can prepare the exact shared-task payload, assignee, due time, customer reference, and source context.",
    sourceSystem: "Task Engine",
    crmNextSurface: "Attend Mode task bridge",
    dispatchSurface: "Dispatch Board / My Tasks",
    safety: "The bridge still returns liveTaskCreated=false until task creation is explicitly approved.",
    href: "/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview"
  },
  {
    id: "dispatch-context",
    milestone: "CRMN-051",
    title: "Dispatch Board customer context",
    state: "Read-only",
    description: "CRM-originated work keeps the customer name, reason, related vehicle/deal/case, and recommended next action visible.",
    sourceSystem: "TaskReadModel + customer context",
    crmNextSurface: "Customer 360 / Attend Mode",
    dispatchSurface: "Task detail and manager work queues",
    safety: "Dispatch Board remains the operational owner of task status and assignment.",
    href: "#dispatch-context"
  },
  {
    id: "comments-blockers-sync",
    milestone: "CRMN-052",
    title: "Comments, blockers, and review sync",
    state: "Read-only",
    description: "CRM Next displays shared comments, blocker reason, review state, and status without copying those records.",
    sourceSystem: "Task comments, blockers, and review fields",
    crmNextSurface: "Attend Mode context rail",
    dispatchSurface: "Task detail",
    safety: "No duplicate comment or blocker store is introduced.",
    href: "#sync"
  },
  {
    id: "task-activity-customer-timeline",
    milestone: "CRMN-053",
    title: "Task activity → Customer 360 timeline",
    state: "Read-only",
    description: "Task progress can appear as customer activity while the original task activity remains event-backed.",
    sourceSystem: "ActivityEvent / task activity history",
    crmNextSurface: "Customer 360 Activity",
    dispatchSurface: "Task activity feed",
    safety: "Timeline uses linked context and does not infer hidden history from UI state.",
    href: "/crm-next/timeline"
  },
  {
    id: "manager-exception-queue",
    milestone: "CRMN-054",
    title: "Manager customer-work queue",
    state: "Manager review",
    description: "Managers can review unassigned, blocked, overdue, escalated, and approval-needed CRM/customer work.",
    sourceSystem: "Manager review + Unified CRM exception queues",
    crmNextSurface: "Manager intelligence queue",
    dispatchSurface: "Manager workspace",
    safety: "Reassignment, escalation, and override actions remain held.",
    href: "#manager-queue"
  }
];

const intelligenceRecords: CrmNextIntelligenceRecord[] = [
  {
    id: "signal-foundation",
    milestone: "CRMN-060",
    kind: "Signal",
    title: "Explainable customer-work signals",
    confidence: "Explainable",
    signal: "Overdue follow-up, open deal, upcoming appointment, support case, and recent activity are available as separate inputs.",
    recommendation: "Show the signals together before suggesting work.",
    explanation: "Staff can see what the system considered instead of trusting a hidden score.",
    sourceSystem: "Customer, task, opportunity, appointment, and activity read models",
    safety: "Signals are advisory and do not change customer records.",
    href: "/crm-next/intelligence-foundation"
  },
  {
    id: "risk-posture",
    milestone: "CRMN-061",
    kind: "Risk",
    title: "Medium risk explained",
    confidence: "Needs review",
    signal: "Payment due, open support case, and overdue customer follow-up are present.",
    recommendation: "Review the customer before moving work forward.",
    explanation: "Risk is shown as a review prompt, not as an automatic customer restriction.",
    sourceSystem: "Customer 360 risk inputs and support case context",
    safety: "No hidden customer classification, finance action, or account hold is created.",
    href: "#risk"
  },
  {
    id: "next-best-action",
    milestone: "CRMN-062",
    kind: "Next Action",
    title: "Call Michael Johnson",
    confidence: "Human decides",
    signal: "Overdue follow-up and high-value opportunity are both visible.",
    recommendation: "Open Attend Mode and prepare a call/task preview.",
    explanation: "The recommendation is useful because the customer is overdue and has active purchase context.",
    sourceSystem: "Needs Attention + opportunity read model",
    safety: "No live call, text, email, or task is created.",
    href: "/crm-next/work/attn-michael-overdue-follow-up"
  },
  {
    id: "opportunity-intelligence",
    milestone: "CRMN-063",
    kind: "Opportunity",
    title: "Opportunity value signal",
    confidence: "Explainable",
    signal: "Open proposal, vehicle interest, and recent customer activity are connected.",
    recommendation: "Review pipeline context before the next outreach.",
    explanation: "The system can highlight value without changing deal stage.",
    sourceSystem: "Lead/opportunity read adapters",
    safety: "Pipeline remains read-only and stage movement remains disabled.",
    href: "/crm-next/pipeline"
  },
  {
    id: "priority-rules",
    milestone: "CRMN-064",
    kind: "Priority",
    title: "Priority order with visible reasons",
    confidence: "Explainable",
    signal: "Age, impact, area, owner, and risk determine the review order.",
    recommendation: "Keep high-impact overdue work above lower-risk reminders.",
    explanation: "Managers and staff can challenge the reason instead of guessing why a row moved.",
    sourceSystem: "Needs Attention queue rules",
    safety: "No invisible reprioritization is applied to Dispatch Board tasks.",
    href: "#priority"
  },
  {
    id: "needs-attention-intelligence",
    milestone: "CRMN-065",
    kind: "Queue",
    title: "Needs Attention intelligence",
    confidence: "Needs review",
    signal: "Customer reason, owner, area, and recommended next action are bundled for review.",
    recommendation: "Open one customer, finish the safe next step, then return to the queue.",
    explanation: "The queue is designed to reduce hunting around the app.",
    sourceSystem: "CRM Next attention read model",
    safety: "Queue rows do not create or complete work by themselves.",
    href: "/crm-next/needs-attention"
  },
  {
    id: "feedback-loop",
    milestone: "CRMN-066",
    kind: "Feedback",
    title: "Recommendation feedback loop",
    confidence: "Human decides",
    signal: "Staff can later mark recommendations as accepted, skipped, corrected, or escalated.",
    recommendation: "Prepare feedback categories before enabling learning or automation.",
    explanation: "Useful AI needs a way for staff to say when the suggestion helped or missed context.",
    sourceSystem: "Future staff feedback events",
    safety: "No model training, preference mutation, or customer update happens in this slice.",
    href: "#feedback"
  },
  {
    id: "manager-intelligence",
    milestone: "CRMN-067",
    kind: "Manager Intelligence",
    title: "Manager intelligence cockpit",
    confidence: "Needs review",
    signal: "Unassigned, blocked, overdue, approval-needed, and escalated customer work can be reviewed together.",
    recommendation: "Give managers explainable review without live override controls.",
    explanation: "Managers need visibility first; controls come after permissions and audit approval.",
    sourceSystem: "Manager review and exception queue read models",
    safety: "No reassignment, override, escalation, or approval mutation is enabled.",
    href: "#manager-intelligence"
  }
];

const commandCenterModes: CrmNextCommandCenterMode[] = [
  {
    id: "review-ux-completion",
    milestone: "CRMN-068",
    audience: "All staff",
    title: "Compact review cockpit",
    state: "Review ready",
    objective: "Keep the question simple, then show only the work surfaces that matter now.",
    primaryMetric: "1-line question",
    secondaryMetric: "0 live writes",
    guidance: "Start with the customer that needs attention, then move through Customer 360, Attend Mode, and source-owned work.",
    href: "/crm-next"
  },
  {
    id: "review-state-labels",
    milestone: "CRMN-069",
    audience: "All staff",
    title: "Clear review-state labels",
    state: "Review ready",
    objective: "Make preview-only, read-only, and held states obvious before staff click.",
    primaryMetric: "3 states",
    secondaryMetric: "safe by default",
    guidance: "If a card looks operational, it must show whether it is review-ready, preview-only, or held.",
    href: "/crm-next/progress"
  },
  {
    id: "employee-command-center",
    milestone: "CRMN-070",
    audience: "Employee",
    title: "Employee Command Center",
    state: "Review ready",
    objective: "Give staff one place to see their next customer action and open the correct workspace.",
    primaryMetric: "48 need attention",
    secondaryMetric: "19 overdue",
    guidance: "Employees should not hunt through modules; the queue tells them who to work and why.",
    href: "/crm-next/needs-attention"
  },
  {
    id: "manager-command-center",
    milestone: "CRMN-071",
    audience: "Manager",
    title: "Manager Command Center",
    state: "Preview only",
    objective: "Give managers compact oversight of blocked, overdue, escalated, and review-needed customer work.",
    primaryMetric: "5 review lanes",
    secondaryMetric: "0 overrides",
    guidance: "Managers can review pressure and exceptions without live reassignment or escalation controls.",
    href: "/crm-next/shared-execution#manager-queue"
  },
  {
    id: "appointments-work-summary",
    milestone: "CRMN-072",
    audience: "All staff",
    title: "Appointments & work summary",
    state: "Review ready",
    objective: "Show today’s appointments and task-linked customer work without replacing source systems.",
    primaryMetric: "12 appointments",
    secondaryMetric: "task bridge preview",
    guidance: "CRM Next points staff to the right context while appointments and tasks remain authoritative elsewhere.",
    href: "/crm-next/appointments"
  },
  {
    id: "pipeline-intelligence-summary",
    milestone: "CRMN-073",
    audience: "Manager",
    title: "Pipeline & intelligence summary",
    state: "Review ready",
    objective: "Put pipeline value, risk, and next-action intelligence together in one executive scan.",
    primaryMetric: "$1.24M MTD",
    secondaryMetric: "8 intelligence signals",
    guidance: "Use pipeline and intelligence together to decide where attention should go next.",
    href: "/crm-next/intelligence-foundation"
  },
  {
    id: "team-load-indicators",
    milestone: "CRMN-074",
    audience: "Manager",
    title: "Team response & load indicators",
    state: "Preview only",
    objective: "Expose workload pressure before enabling any assignment automation.",
    primaryMetric: "High response load",
    secondaryMetric: "manual review",
    guidance: "Load indicators explain pressure; they do not silently move work between employees.",
    href: "/crm-next/shared-execution"
  }
];

export function getCrmNextCommandCenter(actor: AuthenticatedUser | null, now: Date = new Date()): CrmNextCommandCenter {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    throw Object.assign(new Error("CRM Next is not enabled for this user."), { code: access.reason });
  }

  return {
    contractVersion: "crm-next-command-center/v1",
    generatedAt: now.toISOString(),
    userName: actor?.name ?? "CRM user",
    mode: "REVIEW",
    summary: [
      { label: "Needs Attention", value: "48", trend: "12 from yesterday", tone: "blue" },
      { label: "Hot Leads", value: "26", trend: "8 from yesterday", tone: "red" },
      { label: "Appointments Today", value: "12", trend: "3 from yesterday", tone: "green" },
      { label: "Deals in Progress", value: "37", trend: "5 from yesterday", tone: "green" },
      { label: "Overdue Follow-ups", value: "19", trend: "4 from yesterday", tone: "red" }
    ],
    attention: attentionItems,
    pipeline: [
      { label: "Leads", value: 76 },
      { label: "Contacted", value: 42 },
      { label: "Qualified", value: 24 },
      { label: "Proposal", value: 15 },
      { label: "Negotiation", value: 10 },
      { label: "Won", value: 7 }
    ],
    revenue: { monthToDate: "$1,245,800", trend: "18% vs last month" },
    nextActions: [
      { id: "nba-call-michael", label: "Call Michael Johnson", detail: "Overdue follow-up. High conversion likelihood.", impact: "High", href: "/crm-next/work/attn-michael-overdue-follow-up" },
      { id: "nba-payment-sarah", label: "Send payment reminder to Sarah Williams", detail: "Payment due in 5 days.", impact: "High", href: "/crm-next/work/attn-sarah-payment" },
      { id: "nba-test-drive-david", label: "Schedule test drive with David Brown", detail: "Interested in 2021 Toyota RAV4.", impact: "Medium", href: "/crm-next/work/attn-david-title" }
    ],
    customers,
    search: {
      queryPlaceholder: "Search customers, vehicles, deals, communications, work...",
      groups: searchGroups
    },
    timeline: timelineEvents,
    sales: {
      leads: salesRecords.filter((record) => record.stage === "Qualified"),
      opportunities: salesRecords,
      appointments: salesRecords.filter((record) => record.id !== "sales-sarah-trade"),
      testDrives: salesRecords.filter((record) => record.stage === "Test Drive"),
      deals: salesRecords
    },
    ownershipSupport: ownershipSupportRecords,
    sharedExecution: sharedExecutionRecords,
    intelligence: intelligenceRecords,
    commandCenter: {
      headline: "Who needs attention?",
      guidance: "A compact command center for reviewing customer pressure, next actions, team load, pipeline context, and safe handoffs.",
      modes: commandCenterModes
    },
    bridge: {
      liveTaskCreationEnabled: false,
      previewEnabled: true,
      message: "Action-to-task dispatch bridge is in review mode. No Dispatch Board task is created yet."
    },
    progress: {
      completedCount: progressMilestones.filter((milestone) => ["IMPLEMENTED_UNVERIFIED", "VERIFIED"].includes(milestone.status)).length,
      envelopeCount: 20,
      verifiedCount: progressMilestones.filter((milestone) => milestone.status === "VERIFIED").length,
      heldCount: progressMilestones.filter((milestone) => milestone.status === "HELD").length,
      nextMilestone: "CRMN-075",
      milestones: progressMilestones
    }
  };
}

export function getCrmNextCustomer360(actor: AuthenticatedUser | null, customerId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.customers.find((customer) => customer.id === customerId) ?? model.customers[0];
}

export function getCrmNextAttentionItem(actor: AuthenticatedUser | null, itemId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.attention.find((item) => item.id === itemId) ?? model.attention[0];
}
