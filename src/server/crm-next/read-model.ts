import type { AuthenticatedUser } from "@/server/auth/store";
import { CRM_NEXT_CUSTOMERS_HREF } from "@/features/crm/crm-route-authority";
import { getInitialMinneapolisLocation } from "@/server/appointments/location-foundation";
import {
  getLocationLocalDate,
  locationLocalDateMinuteToInstant
} from "@/server/appointments/location-time-service";
import { resolveCrmNextAccess, type CrmNextMode } from "@/server/crm-next/access";
import { buildEnterpriseReportingBrief, type EnterpriseReportingBrief } from "@/lib/enterprise-reporting-intelligence";
import { buildSupportingPartyContext, type SupportingPartyContext } from "@/lib/supporting-party-context";
import { evaluateWorkflowAutomationRules, type AutomationAction } from "@/lib/workflow-automation-rules";
import { listEnterpriseAdminControls } from "@/server/enterprise-admin/controls";
import { listAppointmentReadModels } from "@/server/services/appointment-read-service";
import { listRecentCustomerLeads } from "@/server/services/customer-lead-service";
import { getSalesConsoleReadModel } from "@/server/services/sales-console-read-service";
import { getUnifiedCrmCustomer360 } from "@/server/services/unified-crm-customer-360-service";
import { getUnifiedCrmCustomerList } from "@/server/services/unified-crm-customer-read-service";
import { searchUnifiedCrm } from "@/server/services/unified-crm-global-search-service";
import type {
  UnifiedCrmCustomer360ReadModel,
  UnifiedCrmCustomer360TimelineItem
} from "@/server/unified-crm/customer-360-contract";
import type {
  UnifiedCrmCustomerListItem,
  UnifiedCrmCustomerListReadModel
} from "@/server/unified-crm/customer-read-contract";
import type { UnifiedCrmGlobalSearchReadModel } from "@/server/unified-crm/global-search-contract";

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
  dealPrefill: {
    address: string;
    dateOfBirth: string;
    email: string;
    idLast4: string;
    idState: string;
    idType: string;
    phoneNumber: string;
    ssnLast4: string;
  };
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

function emptyDealPrefill(): CrmNextCustomer360["dealPrefill"] {
  return { address: "", dateOfBirth: "", email: "", idLast4: "", idState: "", idType: "", phoneNumber: "", ssnLast4: "" };
}

export type CrmNextTimelineEvent = {
  id: string;
  source: "Customer" | "Communication" | "Opportunity" | "Appointment" | "Dispatch" | "Vehicle" | "Finance" | "Support" | "Insurance";
  label: string;
  detail: string;
  occurredAt: string;
  href: string;
  sourceRecordId?: string;
};

export type CrmNextOperationalReadState = "LIVE_READ" | "PARTIAL_READ" | "FALLBACK_READ" | "EMPTY_READ";

export type CrmNextSourceReadStatus = {
  id: "customers" | "customer-360" | "search" | "attention" | "timeline";
  label: string;
  state: CrmNextOperationalReadState;
  sourceOfTruth: string;
  detail: string;
  observedAt: string;
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

export type CrmNextLeadSourcePerformance = {
  id: string;
  label: string;
  leads: number;
  contacted: number;
  appointments: number;
  deals: number;
  sold: number;
  stale: number;
  conversionRate: string;
  health: "Strong" | "Needs work" | "At risk";
  leak: string;
  nextAction: string;
  href: string;
};

export type CrmNextLeadSourceAction = {
  id: string;
  label: string;
  customer: string;
  source: string;
  reason: string;
  href: string;
};

export type CrmNextLeadSourceReport = {
  generatedFrom: "Live CRM lead/customer source" | "Customer Console review sources";
  summary: string;
  sources: CrmNextLeadSourcePerformance[];
  actionQueue: CrmNextLeadSourceAction[];
  workflow: Array<{ step: string; goal: string }>;
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

export type CrmNextPilotScenario = {
  id: string;
  milestone: "CRMN-075" | "CRMN-076" | "CRMN-077" | "CRMN-078" | "CRMN-079";
  category: "Customer" | "Needs Attention" | "Customer 360" | "Timeline" | "Manager Review";
  title: string;
  reviewState: "Pilot review" | "Read-only" | "Foundation only";
  summary: string;
  sourceOfTruth: string;
  nextReviewStep: string;
  href: string;
};

export type CrmNextHardeningGate = {
  id: string;
  milestone: "CRMN-080" | "CRMN-081" | "CRMN-082" | "CRMN-083" | "CRMN-084" | "CRMN-085" | "CRMN-086";
  category: "Migration" | "Testing" | "Accessibility" | "Performance" | "Security" | "Rollback" | "Evidence";
  title: string;
  status: CrmNextMilestoneStatus;
  reviewState: "Held for approval" | "Implemented for review" | "Proof required";
  proof: string;
  riskControl: string;
  nextStep: string;
};

export type CrmNextCoexistenceGate = {
  id: string;
  milestone: "CRMN-087" | "CRMN-088" | "CRMN-089" | "CRMN-090";
  title: string;
  status: CrmNextMilestoneStatus;
  legacyOwner: string;
  crmNextRole: string;
  cutoverRule: string;
  rollbackRule: string;
  safety: string;
};

export type CrmNextPilotReleaseGate = {
  id: string;
  milestone: "CRMN-091" | "CRMN-092" | "CRMN-093" | "CRMN-094";
  title: string;
  status: CrmNextMilestoneStatus;
  owner: "Product" | "Operations" | "Engineering" | "Leadership";
  decision: "Ready for review" | "Proof required" | "Held for approval";
  requirement: string;
  proof: string;
  cannotProceedUntil: string;
};

export type CrmNextOperatingAction = {
  id: "log-call" | "send-email" | "new-task" | "add-note" | "new-case" | "schedule-appointment" | "upload-document" | "send-text";
  label: string;
  category: "Communication" | "Task" | "Note" | "Case" | "Appointment" | "Document";
  state: "SAFE_ROUTE" | "PREVIEW_ONLY" | "HELD";
  href: string;
  sourceAuthority: string;
  response: string;
  auditPosture: string;
  pilotRequirement: string;
};

export type CrmNextSummaryMetric = {
  href: string;
  label: string;
  source: string;
  tone: "blue" | "green" | "red";
  trend: string;
  value: string;
};

export type CrmNextCommandCenter = {
  contractVersion: "crm-next-command-center/v1";
  generatedAt: string;
  userId: string;
  userName: string;
  mode: Exclude<CrmNextMode, "OFF">;
  summary: CrmNextSummaryMetric[];
  attention: CrmNextAttentionItem[];
  pipeline: Array<{ label: string; value: number }>;
  revenue: { monthToDate: string; trend: string };
  nextActions: Array<{ id: string; label: string; detail: string; impact: CrmNextAttentionLevel; href: string }>;
  customers: CrmNextCustomer360[];
  search: { activeQuery: string; queryPlaceholder: string; groups: CrmNextSearchGroup[] };
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
  leadSourceReport: CrmNextLeadSourceReport;
  commandCenter: {
    headline: string;
    guidance: string;
    modes: CrmNextCommandCenterMode[];
  };
  pilotScenarios: CrmNextPilotScenario[];
  hardeningGates: CrmNextHardeningGate[];
  coexistenceGates: CrmNextCoexistenceGate[];
  pilotReleaseGates: CrmNextPilotReleaseGate[];
  operatingActions: CrmNextOperatingAction[];
  enterpriseLayer: {
    adminGuardrails: Array<{ href: string; summary: string; title: string }>;
    automationRecommendations: AutomationAction[];
    reportingBrief: EnterpriseReportingBrief;
    supportingParties: SupportingPartyContext[];
  };
  bridge: {
    liveTaskCreationEnabled: boolean;
    previewEnabled: true;
    message: string;
  };
  operationalRead: {
    state: CrmNextOperationalReadState;
    safety: string;
    sources: CrmNextSourceReadStatus[];
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
    title: "Customer Console shell and feature flag",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Open Customer Console at /crm-next only when CRM_NEXT is enabled.",
    reviewHref: "/crm-next",
    evidence: "Route, feature flag access guard, fail-closed fallback, and archive/fallback links are implemented.",
    safety: "No fallback route replacement and no customer writes."
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
    safety: "Customer profile is review-only and links back to Customer Archive/older customer tools."
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
    title: "Dispatch handoff bridge",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Let Customer Console create operational Dispatch handoffs only when customer work must leave the CRM workbench.",
    reviewHref: "/crm-next/work/attn-michael-overdue-follow-up#dispatch-preview",
    evidence: "Bridge contract returns a preview shape in review mode and creates a Dispatch handoff only when enabled after user confirmation.",
    safety: "Ordinary CRM tasks stay inside CRM; live communications, payments, documents, customer writes, and route replacement remain held."
  },
  {
    id: "CRMN-016",
    title: "Visible implementation progress",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show the build status and next 20-milestone envelope in Customer Console itself.",
    reviewHref: "/crm-next/progress",
    evidence: "Progress board is available at /crm-next/progress as the review cockpit.",
    safety: "Status uses approved vocabulary and does not overstate completion."
  },
  {
    id: "CRMN-017",
    title: "UX baseline navigation polish",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make Customer Console navigation obvious across Command Center, Customer 360, Work Customer, and Progress.",
    reviewHref: "/crm-next",
    evidence: "Primary navigation, search entry, Customer Archive/older customer tools links, and progress review links are wired.",
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
    evidence: "Customer, vehicle, deal, communication, and work result groups are visible in Customer Console review mode.",
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
    evidence: "Customer Console grids, rows, action cards, and progress cockpit collapse for smaller screens.",
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
    title: "Archive and fallback links",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make switchback between Customer Console and archive/older customer tools obvious during pilot.",
    reviewHref: "/crm-next",
    evidence: "Customer Console sidebar, unavailable state, progress cockpit, and work views include archive/older customer tools exits.",
    safety: "Fallback routes remain operational."
  },
  {
    id: "CRMN-029",
    title: "Route and rollback proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove Customer Console can be disabled without harming existing workspaces.",
    reviewHref: "/crm-next/system/rollback",
    evidence: "Rollback review page and access tests cover CRM_NEXT off behavior.",
    safety: "CRM_NEXT off returns to safe workspaces."
  },
  {
    id: "CRMN-030",
    title: "Lead/opportunity read adapters",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prepare lead and opportunity read models for Customer Console.",
    reviewHref: "/crm-next/pipeline",
    evidence: "Sales read-model sections expose leads and opportunities for review-safe Customer Console pages.",
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
    evidence: "Appointments review surface links Customer Console context back to the existing appointment workspace.",
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
    safety: "Vehicle workspace remains authoritative; Customer Console is read-only."
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
    title: "CRM task and Dispatch handoff boundary",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Separate customer CRM tasks from operational Dispatch handoffs without creating duplicate work.",
    reviewHref: "/crm-next/shared-execution",
    evidence: "Shared execution surface documents the CRM task boundary and the explicit operational handoff path.",
    safety: "CRM remains authoritative for customer tasks; Dispatch Board remains authoritative only after an operational handoff is created."
  },
  {
    id: "CRMN-051",
    title: "Dispatch Board customer context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show how Dispatch Board work can retain customer context from Customer Console.",
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
    objective: "Make Customer Console review pages feel like a compact enterprise console instead of a prototype.",
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
    evidence: "Appointments/work summary card links to Customer Console appointment and task bridge surfaces.",
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
  },
  {
    id: "CRMN-075",
    title: "Pilot customer scenario expansion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Add realistic customer scenarios so pilot reviewers can judge Customer Console substance.",
    reviewHref: "/crm-next/pilot-readiness#pilot-customers",
    evidence: "Pilot readiness surface includes multi-customer review scenarios with source labels.",
    safety: "Scenario data is read-only and does not create customer records."
  },
  {
    id: "CRMN-076",
    title: "Needs Attention scenario expansion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expand queue scenarios across sales, finance, service, and support.",
    reviewHref: "/crm-next/pilot-readiness#pilot-attention",
    evidence: "Pilot readiness surface includes queue scenarios and review-only next steps.",
    safety: "No queue automation or task mutation."
  },
  {
    id: "CRMN-077",
    title: "Customer 360 scenario expansion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Represent richer Customer 360 review examples across vehicles, deals, support, and ownership.",
    reviewHref: "/crm-next/pilot-readiness#pilot-customer-360",
    evidence: "Pilot readiness surface documents expanded Customer 360 review coverage.",
    safety: "No customer profile writes."
  },
  {
    id: "CRMN-078",
    title: "Timeline and communications scenario expansion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show richer activity and communication examples without sending messages.",
    reviewHref: "/crm-next/pilot-readiness#pilot-timeline",
    evidence: "Pilot readiness surface includes timeline/communications review scenarios.",
    safety: "No live calls, texts, emails, or activity writes."
  },
  {
    id: "CRMN-079",
    title: "Manager pilot-review scenarios",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Add manager review scenarios for blocked, overdue, escalated, and load-sensitive work.",
    reviewHref: "/crm-next/pilot-readiness#pilot-manager-review",
    evidence: "Pilot readiness surface includes manager review scenarios and source boundaries.",
    safety: "No manager override or reassignment mutation."
  },
  {
    id: "CRMN-080",
    title: "Migration reconciliation hold",
    status: "HELD",
    objective: "Document migration/reconciliation readiness without executing data migration.",
    reviewHref: "/crm-next/hardening#migration-hold",
    evidence: "Hardening surface identifies migration as approval-gated before any customer, opportunity, communication, or task data movement.",
    safety: "No data migration, reconciliation write, fallback replacement, or cutover."
  },
  {
    id: "CRMN-081",
    title: "Pilot scenario proof plan",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Define the pilot proof checks reviewers should run before promotion.",
    reviewHref: "/crm-next/hardening#scenario-proof",
    evidence: "Hardening surface lists the proof bundle for customer, queue, Customer 360, work, and manager scenarios.",
    safety: "Proof is read-only and does not mutate records."
  },
  {
    id: "CRMN-082",
    title: "Accessibility and responsive review",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Track accessibility and responsive-layout checks before pilot promotion.",
    reviewHref: "/crm-next/hardening#accessibility",
    evidence: "Hardening surface records keyboard, label, contrast, and responsive review expectations.",
    safety: "No UX promotion until the review is accepted."
  },
  {
    id: "CRMN-083",
    title: "Performance budget review",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Set review expectations for fast Customer Console navigation and read-model rendering.",
    reviewHref: "/crm-next/hardening#performance",
    evidence: "Hardening surface captures performance guardrails for read-only Customer Console pages.",
    safety: "No additional polling, live sync, or background mutation."
  },
  {
    id: "CRMN-084",
    title: "Security and audit review",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make permission, audit, consent, and sensitive-data boundaries visible before pilot.",
    reviewHref: "/crm-next/hardening#security-audit",
    evidence: "Hardening surface captures permission and audit guardrails.",
    safety: "No live communication, payment, document, manager override, or restricted finance action."
  },
  {
    id: "CRMN-085",
    title: "Rollback rehearsal",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show the rollback path and archive/fallback expectations before pilot.",
    reviewHref: "/crm-next/hardening#rollback",
    evidence: "Hardening surface describes the CRM_NEXT-off rollback posture.",
    safety: "Customer Console remains isolated from fallback routes."
  },
  {
    id: "CRMN-086",
    title: "Hardening evidence package",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Collect the hardening gates into one reviewer-facing evidence package.",
    reviewHref: "/crm-next/hardening#evidence-package",
    evidence: "Hardening page summarizes the pilot controls and links back to progress.",
    safety: "Evidence-only; no operational enablement."
  },
  {
    id: "CRMN-087",
    title: "Fallback coexistence map",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make archive/older customer tools coexistence rules visible before pilot.",
    reviewHref: "/crm-next/coexistence#legacy-coexistence",
    evidence: "Coexistence surface maps fallback owners, Customer Console review roles, cutover rules, and rollback rules.",
    safety: "No fallback route replacement."
  },
  {
    id: "CRMN-088",
    title: "Capability migration plan",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Document which capabilities are reused, redesigned, deferred, or kept in fallback routes during pilot.",
    reviewHref: "/crm-next/coexistence#capability-plan",
    evidence: "Coexistence surface keeps capability migration as reviewable planning evidence.",
    safety: "No backend model, API, permission, or data replacement is implied."
  },
  {
    id: "CRMN-089",
    title: "Pilot switchback rules",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Give reviewers clear switchback paths from Customer Console to older customer tools and Customer Archive.",
    reviewHref: "/crm-next/coexistence#switchback",
    evidence: "Coexistence surface documents safe fallback and switchback rules.",
    safety: "Users can return to current operational routes during pilot."
  },
  {
    id: "CRMN-090",
    title: "Fallback retirement not approved",
    status: "HELD",
    objective: "Make fallback retirement explicitly blocked until pilot gates are approved.",
    reviewHref: "/crm-next/coexistence#retirement-hold",
    evidence: "Coexistence surface marks retirement as held and approval-gated.",
    safety: "No fallback deprecation, archive, redirect, or removal."
  },
  {
    id: "CRMN-091",
    title: "Pilot promotion checklist",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Create a visible checklist for pilot promotion review.",
    reviewHref: "/crm-next/pilot-release#promotion-checklist",
    evidence: "Pilot release surface lists promotion requirements and proof expectations.",
    safety: "Checklist does not promote Customer Console by itself."
  },
  {
    id: "CRMN-092",
    title: "Training and operations readiness",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Document staff readiness, support, and operating instructions before pilot.",
    reviewHref: "/crm-next/pilot-release#training-readiness",
    evidence: "Pilot release surface captures training/readiness requirements.",
    safety: "No staff migration or live command enablement."
  },
  {
    id: "CRMN-093",
    title: "Release-candidate proof bundle",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Summarize final proof gates before a pilot decision.",
    reviewHref: "/crm-next/pilot-release#release-proof",
    evidence: "Pilot release surface identifies the final proof bundle: tests, typecheck, lint, route review, rollback, and safety gates.",
    safety: "Proof bundle is evidence-only."
  },
  {
    id: "CRMN-094",
    title: "Pilot launch approval",
    status: "HELD",
    objective: "Hold actual pilot launch until leadership approves the promotion.",
    reviewHref: "/crm-next/pilot-release#pilot-launch-hold",
    evidence: "Pilot release surface marks launch approval as held.",
    safety: "No production rollout, flag broadening, route replacement, or live command enablement."
  },
  {
    id: "CRMN-095",
    title: "Existing customer read adapter",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Let Customer Console consume the existing Customer Console customer read service when it is safely available.",
    reviewHref: "/crm-next",
    evidence: "Operational read adapter overlays Customer source-of-truth data on the Customer Console preview model.",
    safety: "No new customer master and no customer writes."
  },
  {
    id: "CRMN-096",
    title: "Customer identity normalization",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Normalize display name, masked phone, masked email, status, owner, and next-action state for Customer Console.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer list and Customer 360 records map into the Customer Console identity contract with masked contacts.",
    safety: "Source-owned customer identity remains read-only."
  },
  {
    id: "CRMN-097",
    title: "Vehicle relationship read model",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Display existing vehicle relationships in Customer 360 when the customer source exposes them.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 vehicle relationships are mapped to Customer Console vehicle cards with source links preserved.",
    safety: "Customer Console does not create or modify vehicle relationships."
  },
  {
    id: "CRMN-098",
    title: "Partial and inaccessible customer fallback states",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Keep Customer Console reviewable when customer, search, or timeline sources are empty, unavailable, or permission-blocked.",
    reviewHref: "/crm-next",
    evidence: "Operational read source statuses expose LIVE_READ, PARTIAL_READ, EMPTY_READ, or FALLBACK_READ without crashing pages.",
    safety: "Fallback is explicit and keeps Customer Archive/current CRM switchback links available."
  },
  {
    id: "CRMN-099",
    title: "Customer source-of-truth proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove Customer Console reuses the existing customer read model and does not create another customer system.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Unit tests cover live customer overlay, fallback, and no-write bridge posture.",
    safety: "Customer reads only; no create/update/delete path is introduced."
  },
  {
    id: "CRMN-100",
    title: "Existing CRM search adapter",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Wire Customer Console search to the existing Customer search service where available.",
    reviewHref: "/crm-next/search",
    evidence: "Search groups are hydrated from source-owned Customer Console result groups with safe fallback.",
    safety: "Read-only lookup; no source record is changed."
  },
  {
    id: "CRMN-101",
    title: "Grouped operational search results",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Group customer, vehicle, opportunity, quote, task, appointment, and dispatch results in Customer Console.",
    reviewHref: "/crm-next/search",
    evidence: "Customer grouped results are mapped into Customer Console search cards with source links.",
    safety: "Customer Console links to source-owned routes instead of creating a second record store."
  },
  {
    id: "CRMN-102",
    title: "Search empty/error/partial states",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Keep search usable when source data is empty, gated, partial, or unavailable.",
    reviewHref: "/crm-next/search",
    evidence: "Operational read source statuses show LIVE_READ, EMPTY_READ, PARTIAL_READ, or FALLBACK_READ.",
    safety: "Safe navigation remains available to Customer Archive and older customer tools."
  },
  {
    id: "CRMN-103",
    title: "Search permissions and feature-flag proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove search respects CRM_NEXT access and Customer read permissions.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Focused tests cover enabled access, fail-closed access, and mocked search source outcomes.",
    safety: "Denied users never reach Customer Console operational search."
  },
  {
    id: "CRMN-104",
    title: "Source-linked Needs Attention adapter",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Build the Needs Attention queue from existing customer next-action signals where available.",
    reviewHref: "/crm-next/needs-attention",
    evidence: "Customer read items become prioritized attention rows with source customer links.",
    safety: "Queue generation does not move, assign, or create work."
  },
  {
    id: "CRMN-105",
    title: "Deterministic priority reasons",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Make priority explainable using due/overdue next-action state rather than opaque automation.",
    reviewHref: "/crm-next/needs-attention",
    evidence: "Priority is derived deterministically from source next-action dates and displayed as High/Medium/Low.",
    safety: "Human staff decide execution; Customer Console only explains read-only priority."
  },
  {
    id: "CRMN-106",
    title: "Source-linked records before synthetic examples",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prefer source-owned customer records over synthetic examples when live reads return data.",
    reviewHref: "/crm-next/needs-attention",
    evidence: "Operational overlays replace static attention rows only when existing customer reads succeed.",
    safety: "Fallback remains honest and visible when source reads are unavailable."
  },
  {
    id: "CRMN-107",
    title: "Manager/staff queue filter foundation",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Expose owner and source-state context needed for manager/staff filtering without creating write controls.",
    reviewHref: "/crm-next/needs-attention",
    evidence: "Attention rows carry owner, area, priority, and source-backed customer links for read-only filtering surfaces.",
    safety: "No reassignment, escalation, or status movement is enabled."
  },
  {
    id: "CRMN-108",
    title: "Needs Attention no-write proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove source-linked attention remains read-only and feature-flag protected.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Focused operational tests cover priority ordering, source ownership, fallback, and live-write-disabled bridge posture.",
    safety: "No Dispatch handoff creation or customer mutation is introduced."
  },
  {
    id: "CRMN-109",
    title: "Customer 360 tasks/cases context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Map existing Customer 360 source lenses into Customer Console context where available.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Cases and source lenses contribute open-case counts and source-linked glance data.",
    safety: "Customer Console does not create, close, or edit cases."
  },
  {
    id: "CRMN-110",
    title: "Customer 360 appointments/test drives",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show appointment context from existing source-owned Customer 360 appointment reads.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 appointment counts link staff back to the existing appointment workspace.",
    safety: "No scheduling command is enabled."
  },
  {
    id: "CRMN-111",
    title: "Customer 360 deal/opportunity context",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show existing opportunity visibility in Customer 360.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Opportunity lens counts are mapped into Customer Console open-deal/glance context.",
    safety: "No deal movement, quote approval, payment, or estimate mutation."
  },
  {
    id: "CRMN-112",
    title: "Ownership/support context boundary",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Keep documents, title, ownership, finance, and support context source-owned and review-only.",
    reviewHref: "/crm-next/ownership-support",
    evidence: "Customer 360 and Ownership & Support surfaces preserve source links and held-state messaging.",
    safety: "No document send/upload or payment action is enabled."
  },
  {
    id: "CRMN-113",
    title: "Customer 360 integration proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove Customer 360 handles live detail, partial data, fallback, and no-record scenarios.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Operational read tests cover Customer 360 mapping, vehicle relationships, timeline mapping, and fallback posture.",
    safety: "Customer 360 remains read-only."
  },
  {
    id: "CRMN-114",
    title: "Timeline read-model reuse",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Reuse existing customer timeline/activity read infrastructure where available.",
    reviewHref: "/crm-next/timeline",
    evidence: "Customer 360 timeline items map into Customer timeline events with source labels.",
    safety: "No duplicate ActivityEvent write path."
  },
  {
    id: "CRMN-115",
    title: "Timeline source labels and links",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Show source labels and safe source links for each operational timeline event.",
    reviewHref: "/crm-next/timeline",
    evidence: "Timeline events preserve source labels and sourceHref values from the existing timeline service.",
    safety: "Opening a timeline event navigates to the source-owned record."
  },
  {
    id: "CRMN-116",
    title: "Timeline no-duplicate-write proof",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Prove Customer timeline rendering does not create or duplicate activity records.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Operational tests exercise timeline mapping through mocked read services only.",
    safety: "No activity creation API is called."
  },
  {
    id: "CRMN-117",
    title: "Operational read progress cockpit",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Update Customer Console progress with CRMN-095 through CRMN-119.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Progress surface includes the operational read envelope and source-status strip.",
    safety: "Progress is evidence-only and does not promote Customer Console."
  },
  {
    id: "CRMN-118",
    title: "Operational read readiness documentation",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Record implementation evidence, safety posture, review locations, and remaining gates.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "CRM_NEXT_IMPLEMENTATION_READINESS.md records the operational-read envelope status.",
    safety: "Documentation confirms no live writes, communications, migration, route replacement, or pilot launch."
  },
  {
    id: "CRMN-119",
    title: "Final operational read proof bundle",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Run focused Customer Console tests, typecheck, scoped lint, and git status before handoff.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Final proof bundle is run after implementation and recorded in the handoff.",
    safety: "Envelope remains read-only until later explicit approval."
  },
  {
    id: "CRMN-120",
    title: "Operating CRM navigation conversion",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Convert Customer Console from a build-review cockpit into a usable operating CRM navigation model.",
    reviewHref: "/crm-next/review",
    evidence: "Staff navigation now emphasizes operating CRM work while governance/proof pages move behind Review Center.",
    safety: "Review pages remain available for approval checks without cluttering regular staff workflows."
  },
  {
    id: "CRMN-121",
    title: "Compact enterprise Customer 360 redesign",
    status: "IMPLEMENTED_UNVERIFIED",
    objective: "Redesign Customer 360 using the compact customer archive landing page as the review baseline.",
    reviewHref: "/crm-next/customers/michael-johnson",
    evidence: "Customer 360 now leads with the customer profile, compact metrics, tabs, right-side quick actions, next-best-action, risk, and linked vehicles.",
    safety: "Layout-only redesign; source reads remain read-only and live writes/communications stay gated."
  }
];

const pilotOperatingMilestones: CrmNextMilestoneProgress[] = [
  ["CRMN-122", "Customer 360 production-quality recovery", "/crm-next/customers/michael-johnson", "Customer 360 is stabilized as a compact operating page with complete section navigation and no intentional dead controls."],
  ["CRMN-123", "Operating Customer List", "/crm-next/search", "Customer discovery uses source-owned customer/search reads with honest fallback states."],
  ["CRMN-124", "Needs Attention operating queue", "/crm-next/needs-attention", "Needs Attention rows explain priority, owner, reason, customer, and next safe work path."],
  ["CRMN-125", "Attend Mode usable workflow", "/crm-next/work/attn-michael-overdue-follow-up", "Attend Mode guides staff from context to safe action preview and source-owned follow-up."],
  ["CRMN-126", "Quick Actions wired to safe backend paths", "/crm-next/actions/log-call", "Visible quick actions route to safe action readiness pages or existing source-owned workspaces instead of dead anchors."],
  ["CRMN-127", "Dispatch Board task bridge pilot readiness", "/crm-next/actions/new-task", "Customer Console creates internal Dispatch Board tasks when task creation is enabled and preserves a controlled fallback otherwise."],
  ["CRMN-128", "Activity/timeline integration", "/crm-next/timeline", "Timeline stays source-linked and avoids duplicate Customer Console activity writes."],
  ["CRMN-129", "Cases/issues operating surface", "/crm-next/actions/new-case", "Case intake is represented as a safe readiness path with common case fields and source ownership."],
  ["CRMN-130", "Appointments operating surface", "/crm-next/actions/schedule-appointment", "Appointment action routes through the existing appointment workspace authority."],
  ["CRMN-131", "Deals/opportunities operating surface", "/crm-next/deals", "Deals and opportunities remain read-only with valid source/work destinations."],
  ["CRMN-132", "Documents/title readiness surface", "/crm-next/actions/upload-document", "Document and title actions show readiness/authority blockers instead of unsafe upload/send behavior."],
  ["CRMN-133", "Communications readiness and manual outcome capture", "/crm-next/actions/send-email", "Communication actions expose consent/provider/audit readiness without live provider traffic."],
  ["CRMN-134", "Risk and next-best-action rules", "/crm-next/intelligence-foundation", "Risk and next actions remain deterministic, explainable, and human-operated."],
  ["CRMN-135", "Manager queue and oversight", "/crm-next/shared-execution#manager-queue", "Manager oversight shows customer-work pressure without reassignment or override mutation."],
  ["CRMN-136", "Employee command center refinement", "/crm-next", "Staff-facing Customer Console navigation emphasizes daily customer work and keeps review pages hidden under Review Center."],
  ["CRMN-137", "Search refinement", "/crm-next/search", "Search groups route to safe Customer 360, work, timeline, vehicle, deal, appointment, and source-owned destinations."],
  ["CRMN-138", "Permission and role polish", "/crm-next/system/permissions", "Feature flag and role gating remain fail-closed and visible in review evidence."],
  ["CRMN-139", "Error, empty, loading, and fallback states", "/crm-next/system/states", "Expected missing or held capabilities render useful states instead of raw 404/dead ends."],
  ["CRMN-140", "Responsive and overflow proof", "/crm-next/customers/michael-johnson", "Customer Console pages receive containment and compact layout rules to prevent known overflow regressions."],
  ["CRMN-141", "Performance/read-model hygiene", "/crm-next/review", "Read models stay server-side and source-owned without live polling or duplicate business rules."],
  ["CRMN-142", "Audit/event posture", "/crm-next/review", "Every future live-capable action identifies required audit posture before activation."],
  ["CRMN-143", "Release-readiness documentation update", "/crm-next/progress", "Readiness documentation records this envelope, held capabilities, review routes, and blockers."],
  ["CRMN-144", "Route map and no-dead-button proof", "/crm-next/actions/new-task", "Focused tests verify visible Customer Console action destinations render safe pages."],
  ["CRMN-145", "Accessibility/readability pass", "/crm-next", "Normal staff pages use stronger contrast, complete labels, and keyboard-reachable links."],
  ["CRMN-146", "Security and source ownership check", "/crm-next/system/permissions", "Customer Console keeps source-owned services authoritative and does not create a duplicate customer master."],
  ["CRMN-147", "Pilot workflow proof", "/crm-next/needs-attention", "Pilot workflow proof covers Command Center, queue, Customer 360, Attend Mode, action readiness, and switchback."],
  ["CRMN-148", "Rollback/fallback proof", "/crm-next/system/rollback", "CRM_NEXT-off rollback remains route-level because Customer Console does not own source data."],
  ["CRMN-149", "Pilot readiness gate", "/crm-next/pilot-release", "Customer Console is positioned as an internal pilot candidate, not a full release or default CRM."],
  ["CRMN-150", "Final envelope proof bundle", "/crm-next/progress", "Focused tests, lint, typecheck, route proof, and documentation proof are required before handoff."]
].map(([id, title, reviewHref, evidence]) => ({
  id,
  title,
  status: id === "CRMN-150" ? "IN_PROGRESS" : "IMPLEMENTED_UNVERIFIED",
  objective: `Complete ${title.toLowerCase()} as part of the Customer Console pilot-readiness operating envelope.`,
  reviewHref,
  evidence,
  safety: "Customer Console remains behind /crm-next and CRM_NEXT; Customer Archive/older customer tools stay operational; live communications, customer writes, migration, route replacement, and pilot launch remain held unless separately approved."
}));

const allProgressMilestones = [...progressMilestones, ...pilotOperatingMilestones];

const operatingActions: CrmNextOperatingAction[] = [
  {
    id: "log-call",
    label: "Log Call",
    category: "Communication",
    state: "PREVIEW_ONLY",
    href: "/crm-next/actions/log-call",
    sourceAuthority: "Customer communication history",
    response: "Open the call workflow and record the customer outcome.",
    auditPosture: "Requires actor, customer, channel, outcome, timestamp, and source link before live logging.",
    pilotRequirement: "Approve consent, call outcome fields, and audit retention."
  },
  {
    id: "send-email",
    label: "Send Email",
    category: "Communication",
    state: "HELD",
    href: "/crm-next/actions/send-email",
    sourceAuthority: "Approved email workspace",
    response: "Use the approved email workflow with customer context.",
    auditPosture: "Requires template/version, recipient consent, sender, delivery provider, and retention proof.",
    pilotRequirement: "Select provider, approve scopes, templates, opt-out handling, and kill switch."
  },
  {
    id: "send-text",
    label: "Send Text",
    category: "Communication",
    state: "HELD",
    href: "/crm-next/actions/send-text",
    sourceAuthority: "Approved text-message workspace",
    response: "Use the approved text workflow with customer context.",
    auditPosture: "Requires consent, quiet-hours check, template, delivery state, cost guardrail, and opt-out proof.",
    pilotRequirement: "Approve SMS provider, opt-out policy, quiet hours, rate limits, and cost controls."
  },
  {
    id: "new-task",
    label: "Create CRM Task",
    category: "Task",
    state: "PREVIEW_ONLY",
    href: "/crm-next/actions/new-task",
    sourceAuthority: "CRM customer task list",
    response: "Create a CRM task that stays attached to this customer record.",
    auditPosture: "Requires actor, assignee, due date, source customer, task type, outcome expectation, and timeline entry.",
    pilotRequirement: "Approve CRM task fields, ownership rules, completion outcomes, and escalation-to-dispatch boundary."
  },
  {
    id: "add-note",
    label: "Add Note",
    category: "Note",
    state: "PREVIEW_ONLY",
    href: "/crm-next/actions/add-note",
    sourceAuthority: "CRM customer activity timeline",
    response: "Add a customer note directly to this CRM record.",
    auditPosture: "Requires actor, customer, note body, timestamp, and timeline source link.",
    pilotRequirement: "Approve note visibility, retention, edit policy, and activity timeline placement."
  },
  {
    id: "new-case",
    label: "New Case",
    category: "Case",
    state: "PREVIEW_ONLY",
    href: "/crm-next/actions/new-case",
    sourceAuthority: "Common case/support framework",
    response: "Create a customer case with owner, priority, reminder, escalation, due date, CRM task routing, staff queue placement, notification, and resolution criteria.",
    auditPosture: "Requires actor, case type, priority, owner, reminder, escalation trigger, SLA due date, generated CRM task, staff queue entry, notification target, related customer/vehicle/deal, resolution criteria, and source link.",
    pilotRequirement: "Approve case types, ownership rules, reminder and appointment routing, staff queue routing, notification policy, SLA policy, escalation triggers, and close/resolution workflow."
  },
  {
    id: "schedule-appointment",
    label: "Schedule Appointment",
    category: "Appointment",
    state: "SAFE_ROUTE",
    href: "/crm-next/actions/schedule-appointment",
    sourceAuthority: "Existing appointment workspace",
    response: "Routes staff to the existing appointment workspace with Customer Console context.",
    auditPosture: "Appointment mutations remain owned by the appointment workspace.",
    pilotRequirement: "Confirm appointment return path and customer context handoff."
  },
  {
    id: "upload-document",
    label: "Upload Document",
    category: "Document",
    state: "HELD",
    href: "/crm-next/actions/upload-document",
    sourceAuthority: "Approved document workspace",
    response: "Use the approved document workflow with customer context.",
    auditPosture: "Requires document type, retention class, actor, customer, source system, and storage policy.",
    pilotRequirement: "Approve templates, authority, storage, retention, and restricted-field handling."
  }
];

const searchGroups: CrmNextSearchGroup[] = [
  {
    id: "search-customers",
    label: "Customers",
    description: "Find the customer profile, open Customer 360, and continue into Attend Mode.",
    href: "/crm-next/customers",
    count: 0,
    safety: "Search live customer records before taking the next step."
  },
  {
    id: "search-vehicles",
    label: "Vehicles",
    description: "Connect vehicle ownership, service, and inventory context.",
    href: "/vehicles",
    count: 0,
    safety: "Open the vehicle workspace when deeper inventory or service detail is needed."
  },
  {
    id: "search-deals",
    label: "Deals and Opportunities",
    description: "Review deal value, stage, owner, and next customer action.",
    href: "/crm-next/deals",
    count: 0,
    safety: "Open the deal workspace before changing deal status."
  },
  {
    id: "search-communications",
    label: "Communications",
    description: "Review recent phone, text, email, and appointment history.",
    href: "/crm-next/timeline",
    count: 0,
    safety: "Use approved contact workflows for customer outreach."
  },
  {
    id: "search-work",
    label: "Connected Work",
    description: "Jump to Dispatch Board tasks, appointments, cases, and customer work surfaces.",
    href: "/crm-next/needs-attention",
    count: 0,
    safety: "Open verified customer work from the attention queue."
  }
];

const timelineEvents: CrmNextTimelineEvent[] = [];

type LeadSourceReportSeed = {
  customer: string;
  href: string;
  nextAction: string;
  source: string;
  stage: string;
  stale: boolean;
};

function normalizeLeadSource(source: string | null | undefined) {
  const raw = (source ?? "Unknown").trim().toLowerCase().replaceAll("_", " ");
  if (!raw || raw === "unknown") return "Unknown";
  if (raw.includes("walk")) return "Walk-in";
  if (raw.includes("referral")) return "Referral";
  if (raw.includes("website") || raw.includes("web")) return "Website";
  if (raw.includes("facebook")) return "Facebook";
  if (raw.includes("google")) return "Google Ads";
  if (raw.includes("phone") || raw.includes("call")) return "Phone";
  if (raw.includes("repeat")) return "Repeat Customer";
  if (raw.includes("campaign")) return "Campaign";
  if (raw.includes("workbook")) return "Workbook Import";
  if (raw.includes("crm next") || raw.includes("crm")) return "Customer Console";
  return raw.replace(/(^|\s)\S/g, (value) => value.toUpperCase());
}

function stageBucket(stage: string) {
  const normalized = stage.toLowerCase().replaceAll("_", " ");
  return {
    appointment: normalized.includes("appointment") || normalized.includes("onsite") || normalized.includes("on site") || normalized.includes("test drive"),
    contacted: !normalized.includes("new"),
    deal: normalized.includes("qualified") || normalized.includes("proposal") || normalized.includes("negotiation") || normalized.includes("deal") || normalized.includes("won"),
    sold: normalized.includes("won") || normalized.includes("sold")
  };
}

function sourceLeak(input: { appointments: number; contacted: number; deals: number; leads: number; sold: number; stale: number }) {
  if (input.stale > 0) return "Follow-up is aging before staff completes the next contact.";
  if (input.contacted < input.leads) return "New leads are not being contacted fast enough.";
  if (input.appointments < input.contacted) return "Contacts are not turning into appointments.";
  if (input.deals < input.appointments) return "Appointments are not turning into deal work.";
  if (input.sold < input.deals) return "Deals need outcome follow-through.";
  return "Source is moving cleanly through the funnel.";
}

function sourceNextAction(input: { appointments: number; contacted: number; deals: number; leads: number; sold: number; stale: number }) {
  if (input.stale > 0) return "Work stale follow-ups first.";
  if (input.contacted < input.leads) return "Call or text uncontacted leads.";
  if (input.appointments < input.contacted) return "Schedule appointments from contacted leads.";
  if (input.deals < input.appointments) return "Open deal work for appointment-ready customers.";
  if (input.sold < input.deals) return "Review deal blockers and outcomes.";
  return "Keep source cadence steady.";
}

function buildLeadSourceReportFromSeeds(
  seeds: LeadSourceReportSeed[],
  generatedFrom: CrmNextLeadSourceReport["generatedFrom"]
): CrmNextLeadSourceReport {
  const groups = new Map<string, LeadSourceReportSeed[]>();
  for (const seed of seeds) {
    const label = normalizeLeadSource(seed.source);
    groups.set(label, [...(groups.get(label) ?? []), seed]);
  }
  const sources = [...groups.entries()].map(([label, rows]) => {
    const counts = rows.reduce((acc, row) => {
      const bucket = stageBucket(row.stage);
      return {
        appointments: acc.appointments + (bucket.appointment ? 1 : 0),
        contacted: acc.contacted + (bucket.contacted ? 1 : 0),
        deals: acc.deals + (bucket.deal ? 1 : 0),
        sold: acc.sold + (bucket.sold ? 1 : 0),
        stale: acc.stale + (row.stale ? 1 : 0)
      };
    }, { appointments: 0, contacted: 0, deals: 0, sold: 0, stale: 0 });
    const conversion = rows.length ? Math.round((counts.sold / rows.length) * 100) : 0;
    const health: CrmNextLeadSourcePerformance["health"] = counts.stale > 0 ? "At risk" : conversion >= 20 || counts.deals >= Math.max(1, Math.floor(rows.length / 2)) ? "Strong" : "Needs work";
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown",
      label,
      leads: rows.length,
      contacted: counts.contacted,
      appointments: counts.appointments,
      deals: counts.deals,
      sold: counts.sold,
      stale: counts.stale,
      conversionRate: `${conversion}%`,
      health,
      leak: sourceLeak({ leads: rows.length, ...counts }),
      nextAction: sourceNextAction({ leads: rows.length, ...counts }),
      href: `/crm-next/pipeline?source=${encodeURIComponent(label)}`
    };
  }).sort((left, right) => right.stale - left.stale || right.leads - left.leads || left.label.localeCompare(right.label));
  const actionQueue = seeds
    .filter((seed) => seed.stale || !stageBucket(seed.stage).contacted)
    .slice(0, 6)
    .map((seed, index) => ({
      id: `source-action-${index + 1}`,
      customer: seed.customer,
      href: seed.href,
      label: seed.stale ? "Recover stale lead" : "Make first contact",
      reason: seed.stale ? seed.nextAction : "No completed contact recorded yet.",
      source: normalizeLeadSource(seed.source)
    }));
  return {
    generatedFrom,
    summary: "Source performance combines source normalization, funnel movement, stale-work detection, and the next action staff should take.",
    sources,
    actionQueue,
    workflow: [
      { step: "Classify", goal: "Normalize each customer or lead into one clean source category." },
      { step: "Measure", goal: "Compare leads, contacts, appointments, deals, sold outcomes, and stale follow-ups." },
      { step: "Diagnose", goal: "Show where the source is leaking before staff waste time guessing." },
      { step: "Act", goal: "Open the customer, follow up, schedule, or move the lead to the right stage." }
    ]
  };
}

function buildLeadSourceReportFromSales(records: CrmNextSalesRecord[]): CrmNextLeadSourceReport {
  const sourceByIndex = ["Referral", "Workbook Import", "Walk-in", "Website", "Facebook"];
  return buildLeadSourceReportFromSeeds(records.map((record, index) => ({
    customer: record.customerName,
    href: record.href,
    nextAction: record.nextAction,
    source: sourceByIndex[index % sourceByIndex.length],
    stage: record.stage,
    stale: index === 1
  })), "Customer Console review sources");
}

const ownershipSupportRecords: CrmNextOwnershipSupportRecord[] = [
  {
    id: "ownership-vehicle-rav4",
    domain: "Vehicle",
    title: "Vehicle relationship unavailable",
    status: "No source data available",
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
    sourceOfTruth: "Finance/accounting source; Customer Console shows context only"
  },
  {
    id: "ownership-payment-due",
    domain: "Payment",
    title: "Payment status unavailable",
    status: "No source data available",
    priority: "Medium",
    owner: "Finance",
    nextAction: "Open the finance source before taking any payment action.",
    href: "#payment",
    permission: "Held",
    sourceOfTruth: "Payment source; no payment processing in Customer Console"
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
    title: "Title document status unavailable",
    status: "No source data available",
    priority: "Medium",
    owner: "Support",
    nextAction: "Open the document source before recording a title update.",
    href: "#documents",
    permission: "Restricted",
    sourceOfTruth: "CustomerDocumentRequirement / title workflow"
  },
  {
    id: "support-service-open",
    domain: "Service",
    title: "Service follow-up status unavailable",
    status: "No source data available",
    priority: "Medium",
    owner: "Service",
    nextAction: "Open repair/service workspace for authoritative repair action.",
    href: "/vehicles/repair-orders",
    permission: "Open",
    sourceOfTruth: "ServiceVisit / RepairOrder"
  },
  {
    id: "support-rental-loaner",
    domain: "Rental/Loaner",
    title: "Loaner status unavailable",
    status: "No source data available",
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
    title: "Customer issue status unavailable",
    status: "No source data available",
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
    title: "Insurance claim status unavailable",
    status: "No source data available",
    priority: "Low",
    owner: "Support",
    nextAction: "Open the insurance source before recording a claim update.",
    href: "#insurance",
    permission: "Restricted",
    sourceOfTruth: "Insurance claim source / document case"
  }
];

const sharedExecutionRecords: CrmNextSharedExecutionRecord[] = [
  {
    id: "shared-task-linkage",
    milestone: "CRMN-050",
    title: "CRM task → Dispatch handoff only when needed",
    state: "Preview only",
    description: "Customer work stays as a CRM task unless staff explicitly creates an operational Dispatch handoff with the exact payload, assignee, due time, customer reference, and source context.",
    sourceSystem: "Task Engine",
    crmNextSurface: "Customer workbench CRM task and handoff controls",
    dispatchSurface: "Dispatch Board / My Tasks",
    safety: "The bridge only creates Dispatch work for explicit handoff actions; ordinary CRM tasks remain inside the customer record.",
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
    description: "Customer Console displays shared comments, blocker reason, review state, and status without copying those records.",
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
    sourceSystem: "Manager review + Customer exception queues",
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
    title: "Risk source readiness",
    confidence: "Needs review",
    signal: "No source data available.",
    recommendation: "Open a verified customer record before showing risk-specific guidance.",
    explanation: "Risk is shown only when source-backed customer signals exist.",
    sourceSystem: "Customer 360 risk inputs and support case context",
    safety: "No hidden customer classification, finance action, or account hold is created.",
    href: "#risk"
  },
  {
    id: "next-best-action",
    milestone: "CRMN-062",
    kind: "Next Action",
    title: "No source-backed next action available",
    confidence: "Human decides",
    signal: "No source data available.",
    recommendation: "Open a verified customer record before preparing outreach or task work.",
    explanation: "Next actions are withheld until the queue or customer record provides source-backed context.",
    sourceSystem: "Needs Attention + opportunity read model",
    safety: "No live call, text, email, or task is created.",
    href: "/crm-next/needs-attention"
  },
  {
    id: "opportunity-intelligence",
    milestone: "CRMN-063",
    kind: "Opportunity",
    title: "Opportunity value signal",
    confidence: "Explainable",
    signal: "No source data available.",
    recommendation: "Open source-backed pipeline records before showing opportunity guidance.",
    explanation: "Opportunity guidance is withheld until a durable lead or deal source supports it.",
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
    sourceSystem: "Customer attention read model",
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
    guidance: "Customer Console points staff to the right context while appointments and tasks remain authoritative elsewhere.",
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

const pilotScenarios: CrmNextPilotScenario[] = [
  {
    id: "pilot-customers",
    milestone: "CRMN-075",
    category: "Customer",
    title: "Multiple customer records ready for pilot review",
    reviewState: "Pilot review",
    summary: "Pilot review includes active buyer, payment follow-up, title pending, service due, and insurance/document scenarios.",
    sourceOfTruth: "Customer, sales, finance, support, and document read models",
    nextReviewStep: "Confirm the customer mix matches real dealership work before live customer actions are approved.",
    href: "/crm-next/customers/michael-johnson"
  },
  {
    id: "pilot-attention",
    milestone: "CRMN-076",
    category: "Needs Attention",
    title: "Needs Attention spans sales, finance, service, and support",
    reviewState: "Read-only",
    summary: "The queue now has realistic pressure patterns: overdue follow-up, payment reminder, title review, service due, and insurance update.",
    sourceOfTruth: "Customer attention read model linked to source-owned work",
    nextReviewStep: "Review whether staff can understand who to call first without needing a manager to explain the queue.",
    href: "/crm-next/needs-attention"
  },
  {
    id: "pilot-customer-360",
    milestone: "CRMN-077",
    category: "Customer 360",
    title: "Customer 360 has richer ownership and work context",
    reviewState: "Pilot review",
    summary: "Customer 360 review connects profile, vehicles, lifetime value, open deals, support cases, finance/payment, documents, and next action.",
    sourceOfTruth: "Customer 360 read model with ownership/support projections",
    nextReviewStep: "Confirm the screen answers “what is happening with this customer?” in under one minute.",
    href: "/crm-next/customers/michael-johnson"
  },
  {
    id: "pilot-timeline",
    milestone: "CRMN-078",
    category: "Timeline",
    title: "Timeline and communications are reviewable without sending",
    reviewState: "Read-only",
    summary: "The pilot surface shows phone, text, email, appointment, opportunity, support, finance, and Dispatch-linked activity examples.",
    sourceOfTruth: "ActivityEvent and communication read models",
    nextReviewStep: "Validate whether staff can trust the sequence and find the source workspace for follow-up.",
    href: "/crm-next/timeline"
  },
  {
    id: "pilot-manager-review",
    milestone: "CRMN-079",
    category: "Manager Review",
    title: "Manager review scenarios are visible before controls go live",
    reviewState: "Foundation only",
    summary: "Managers can review unassigned, overdue, blocked, escalated, and load-sensitive customer work without live overrides.",
    sourceOfTruth: "Manager review and shared execution read models",
    nextReviewStep: "Approve which manager actions should become live commands in a later gate.",
    href: "/crm-next/shared-execution#manager-queue"
  }
];

const hardeningGates: CrmNextHardeningGate[] = [
  {
    id: "migration-hold",
    milestone: "CRMN-080",
    category: "Migration",
    title: "Migration and reconciliation stay held",
    status: "HELD",
    reviewState: "Held for approval",
    proof: "Archive/customer/opportunity/task/communication data movement is documented as a later approval gate, not part of this build.",
    riskControl: "Customer Archive and /crm remain operational and authoritative.",
    nextStep: "Approve a migration rehearsal plan only after pilot review coverage is accepted."
  },
  {
    id: "scenario-proof",
    milestone: "CRMN-081",
    category: "Testing",
    title: "Pilot proof scenarios are visible",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Proof required",
    proof: "Reviewers can inspect command center, Needs Attention, Customer 360, Attend Mode, timeline, shared execution, and manager scenarios.",
    riskControl: "All proof paths are read-only or preview-only.",
    nextStep: "Run reviewer walkthroughs and capture pass/fail notes before promotion."
  },
  {
    id: "accessibility",
    milestone: "CRMN-082",
    category: "Accessibility",
    title: "Accessibility and responsive review checklist",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Proof required",
    proof: "Keyboard navigation, visible labels, contrast, compact layouts, and mobile/tablet collapse behavior are tracked as promotion checks.",
    riskControl: "No pilot promotion if key navigation or review surfaces are hard to use.",
    nextStep: "Run manual keyboard and screen-size review on the Customer Console routes."
  },
  {
    id: "performance",
    milestone: "CRMN-083",
    category: "Performance",
    title: "Performance budget is stated before live data",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Implemented for review",
    proof: "Customer Console pages use server-side read models and static review data in this envelope to avoid live polling pressure.",
    riskControl: "No background sync, no live communications, and no high-frequency operational polling are enabled.",
    nextStep: "Add measured budgets when live read adapters are connected."
  },
  {
    id: "security-audit",
    milestone: "CRMN-084",
    category: "Security",
    title: "Security, consent, and audit boundaries are explicit",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Proof required",
    proof: "Restricted finance, payment, document, insurance, communication, and manager actions remain gated with source-of-truth labels.",
    riskControl: "No sensitive write or communication command can be triggered from Customer Console.",
    nextStep: "Review permission matrix and audit-event requirements before enabling any command."
  },
  {
    id: "rollback",
    milestone: "CRMN-085",
    category: "Rollback",
    title: "Rollback path stays simple",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Implemented for review",
    proof: "CRM_NEXT can be turned off so /crm-next fails closed while /customers and /crm remain available.",
    riskControl: "No route replacement or fallback deprecation is included in this envelope.",
    nextStep: "Rehearse CRM_NEXT off/on during release-candidate proof."
  },
  {
    id: "evidence-package",
    milestone: "CRMN-086",
    category: "Evidence",
    title: "One evidence page for pilot hardening",
    status: "IMPLEMENTED_UNVERIFIED",
    reviewState: "Implemented for review",
    proof: "Hardening gates are visible from Customer Console navigation and from the progress cockpit.",
    riskControl: "Evidence package is informational and cannot promote, migrate, or enable operations by itself.",
    nextStep: "Use this page as the reviewer checklist before CRMN-087 coexistence planning."
  }
];

const coexistenceGates: CrmNextCoexistenceGate[] = [
  {
    id: "legacy-coexistence",
    milestone: "CRMN-087",
    title: "Fallback routes and Customer Console coexist during pilot",
    status: "IMPLEMENTED_UNVERIFIED",
    legacyOwner: "Customer Archive and current /crm stay operational for active customer work.",
    crmNextRole: "Customer Console provides the review experience at /crm-next without becoming the default CRM.",
    cutoverRule: "No traffic moves to Customer Console by default until pilot gates are approved.",
    rollbackRule: "Disable CRM_NEXT and users return to current operational routes.",
    safety: "Parallel replacement strategy, not uncontrolled hybridization."
  },
  {
    id: "capability-plan",
    milestone: "CRMN-088",
    title: "Capability migration remains deliberate",
    status: "IMPLEMENTED_UNVERIFIED",
    legacyOwner: "Existing backend models, services, APIs, permissions, and integrations remain source-owned.",
    crmNextRole: "Customer Console reuses read models and displays migration decisions before any replacement.",
    cutoverRule: "A capability can move only after source ownership, writes, audit, rollback, and support are approved.",
    rollbackRule: "Retain fallback capability until Customer Console has proof and a fallback.",
    safety: "Replacing the UX does not automatically replace the backend."
  },
  {
    id: "switchback",
    milestone: "CRMN-089",
    title: "Users always have a switchback path",
    status: "IMPLEMENTED_UNVERIFIED",
    legacyOwner: "Fallback routes remain available for real work while Customer Console is reviewed.",
    crmNextRole: "Customer Console includes links back to /customers, /crm, progress, hardening, and source workspaces.",
    cutoverRule: "Pilot users can inspect Customer Console but must use approved operational routes for live execution.",
    rollbackRule: "Switchback is route-level and does not require data rollback because Customer Console does not write.",
    safety: "No reviewer gets trapped in a preview surface."
  },
  {
    id: "retirement-hold",
    milestone: "CRMN-090",
    title: "Fallback retirement is not approved",
    status: "HELD",
    legacyOwner: "Customer Archive and older customer tools remain the operating fallback and source of truth where applicable.",
    crmNextRole: "Customer Console can demonstrate replacement readiness, but cannot retire fallback routes by itself.",
    cutoverRule: "Retirement requires an explicit promotion and cutover approval after pilot evidence is reviewed.",
    rollbackRule: "Keep fallback routes available until a tested rollback plan exists.",
    safety: "No redirect, removal, archive, or deprecation is included in this envelope."
  }
];

const pilotReleaseGates: CrmNextPilotReleaseGate[] = [
  {
    id: "promotion-checklist",
    milestone: "CRMN-091",
    title: "Promotion checklist is ready for reviewers",
    status: "IMPLEMENTED_UNVERIFIED",
    owner: "Product",
    decision: "Ready for review",
    requirement: "Review Customer command center, queues, Customer 360, Attend Mode, hardening, coexistence, and progress cockpit.",
    proof: "Every implemented review route is linked and covered by focused page-render tests.",
    cannotProceedUntil: "Product accepts the review scope and documents any UX blockers."
  },
  {
    id: "training-readiness",
    milestone: "CRMN-092",
    title: "Operations training remains required",
    status: "IMPLEMENTED_UNVERIFIED",
    owner: "Operations",
    decision: "Proof required",
    requirement: "Define who pilots Customer Console, which actions stay in Customer Archive/older customer tools, and where staff go when they hit a held command.",
    proof: "Pilot release page states the training and switchback expectations before Customer Console is promoted.",
    cannotProceedUntil: "Operations signs off on pilot users, support path, and daily workflow instructions."
  },
  {
    id: "release-proof",
    milestone: "CRMN-093",
    title: "Release-candidate proof bundle is visible",
    status: "IMPLEMENTED_UNVERIFIED",
    owner: "Engineering",
    decision: "Proof required",
    requirement: "Run focused Customer Console tests, typecheck, scoped lint, route review, rollback review, and safety review.",
    proof: "Proof requirements are visible in Customer Console and recorded in readiness docs.",
    cannotProceedUntil: "The final proof bundle passes on the release candidate branch."
  },
  {
    id: "pilot-launch-hold",
    milestone: "CRMN-094",
    title: "Pilot launch is held for leadership approval",
    status: "HELD",
    owner: "Leadership",
    decision: "Held for approval",
    requirement: "Leadership must approve pilot scope, rollout audience, communication policy, rollback plan, and fallback coexistence posture.",
    proof: "Customer Console shows launch as held and does not broaden CRM_NEXT or replace existing routes.",
    cannotProceedUntil: "Leadership explicitly approves pilot launch."
  }
];

type CrmNextOperationalReadDependencies = {
  appointmentReader?: typeof listAppointmentReadModels;
  customer360Reader?: typeof getUnifiedCrmCustomer360;
  customerListReader?: typeof getUnifiedCrmCustomerList;
  leadReader?: typeof listRecentCustomerLeads;
  now?: () => Date;
  salesReader?: typeof getSalesConsoleReadModel;
  searchQuery?: string;
  searchReader?: typeof searchUnifiedCrm;
};

const CRM_NEXT_CUSTOMER_LIST_LIMIT = 50;

function readStatus(
  status: Omit<CrmNextSourceReadStatus, "observedAt">,
  observedAt: string
): CrmNextSourceReadStatus {
  return { ...status, observedAt };
}

function operationalState(sources: CrmNextSourceReadStatus[]): CrmNextOperationalReadState {
  const states = sources.map((source) => source.state);
  if (states.some((state) => state === "LIVE_READ") && states.some((state) => state === "FALLBACK_READ")) {
    return "PARTIAL_READ";
  }
  if (states.some((state) => state === "LIVE_READ")) return "LIVE_READ";
  if (states.some((state) => state === "EMPTY_READ")) return "EMPTY_READ";
  return "FALLBACK_READ";
}

function crmNextCustomerListReadOptions(now?: () => Date) {
  return { now, readMode: "REVIEW" as const };
}

function crmNextCustomer360ReadOptions(now?: () => Date) {
  return { now, readMode: "REVIEW" as const, shellMode: "REVIEW" as const };
}

function crmNextSearchReadOptions(now?: () => Date) {
  return { mode: "REVIEW" as const, now };
}

function riskFromNextAction(nextActionAt: string | null, now: Date): CrmNextAttentionLevel {
  if (!nextActionAt) return "Low";
  const dueAt = new Date(nextActionAt);
  if (Number.isNaN(dueAt.getTime())) return "Medium";
  return dueAt.getTime() < now.getTime() ? "High" : "Medium";
}

function nextActionLabel(item: UnifiedCrmCustomerListItem, now: Date) {
  const risk = riskFromNextAction(item.nextActionAt, now);
  if (!item.nextActionAt) return "Review customer record";
  return risk === "High" ? "Review overdue customer follow-up" : "Review scheduled customer follow-up";
}

function crmNextCustomerFromListItem(item: UnifiedCrmCustomerListItem, now: Date): CrmNextCustomer360 {
  const riskLevel = riskFromNextAction(item.nextActionAt, now);
  return {
    id: item.id,
    name: item.displayName,
    status: "Active",
    phone: item.maskedPhone,
    email: item.maskedEmail,
    address: item.address ?? "Address available in Customers",
    customerSince: item.customerNumber,
    lifetimeValue: "Open customer record",
    vehiclesOwned: 0,
    openDeals: 0,
    openCases: 0,
    dealPrefill: { ...emptyDealPrefill(), address: item.address ?? "", dateOfBirth: item.dateOfBirth ?? "", idLast4: item.idLast4 ?? "", idState: item.idState ?? "", idType: item.idType ?? "", ssnLast4: item.ssnLast4 ?? "" },
    riskLevel,
    nextAction: nextActionLabel(item, now),
    vehicles: [],
    glance: [
      { label: "Customer #", value: item.customerNumber, href: item.sourceHref },
      { label: "Owner", value: item.ownerName, href: item.sourceHref },
      { label: "Status", value: item.status, href: item.sourceHref },
      { label: "Next action", value: item.nextActionAt ? new Date(item.nextActionAt).toLocaleString("en-US") : "Not scheduled", href: item.sourceHref }
    ],
    communications: [
      {
        id: `${item.id}-read-source`,
        channel: "Phone",
        detail: item.lastInteractionAt ? "Latest interaction is visible from Customers." : "No recent interaction found.",
        occurredAt: item.lastInteractionAt ?? item.updatedAt
      }
    ]
  };
}

function attentionFromCustomerList(items: UnifiedCrmCustomerListItem[], now: Date): CrmNextAttentionItem[] {
  return items
    .map((item) => {
      const level = riskFromNextAction(item.nextActionAt, now);
      return {
        id: `customer-read-${item.id}`,
        customerId: item.id,
        customerName: item.displayName,
        reason: item.nextActionAt ? (level === "High" ? "Overdue customer follow-up" : "Scheduled customer follow-up") : "Customer record needs review",
        age: item.nextActionAt ? new Date(item.nextActionAt).toLocaleDateString("en-US") : "Source",
        area: "Sales" as const,
        owner: item.ownerName,
        level,
        nextAction: nextActionLabel(item, now),
        workHref: `/crm-next/work/customer-read-${encodeURIComponent(item.id)}`,
        customerHref: `/crm-next/customers/${encodeURIComponent(item.id)}`
      };
    })
    .sort((a, b) => {
      const order: Record<CrmNextAttentionLevel, number> = { High: 0, Medium: 1, Low: 2 };
      return order[a.level] - order[b.level] || a.customerName.localeCompare(b.customerName);
    });
}

function customer360Contact(model: UnifiedCrmCustomer360ReadModel, type: string) {
  return model.contacts.find((contact) => contact.type === type && contact.isPrimary)?.maskedValue ??
    model.contacts.find((contact) => contact.type === type)?.maskedValue ??
    "Not recorded";
}

function sourceToCrmNextTimelineSource(
  item: UnifiedCrmCustomer360TimelineItem
): CrmNextTimelineEvent["source"] {
  if (item.kind.includes("appointment")) return "Appointment";
  if (item.kind.includes("task")) return "Dispatch";
  if (item.kind.includes("case")) return "Support";
  if (item.kind.includes("lead")) return "Opportunity";
  return item.sourceLabel.toLowerCase().includes("finance") ? "Finance" : "Communication";
}

function crmNextCustomerFrom360(model: UnifiedCrmCustomer360ReadModel): CrmNextCustomer360 {
  const riskLevel: CrmNextAttentionLevel =
    model.relationship.nextActionState === "OVERDUE" ? "High" :
      model.relationship.nextActionState === "DUE_TODAY" ? "Medium" : "Low";
  const opportunityCount = model.opportunityLensObservation.visibleRecordCount;
  return {
    id: model.identity.id,
    name: model.identity.displayName,
    status: "Active",
    phone: customer360Contact(model, "PHONE"),
    email: customer360Contact(model, "EMAIL"),
    address: "Address available in Customers",
    customerSince: model.identity.customerSince,
    lifetimeValue: "Open customer record",
    vehiclesOwned: model.vehicles.length,
    openDeals: opportunityCount,
    openCases: model.sourceLenses.cases.length,
    dealPrefill: emptyDealPrefill(),
    riskLevel,
    nextAction: model.relationship.nextActionAt ? "Review next customer action" : "Review customer relationship",
    vehicles: model.vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: vehicle.label,
      status: vehicle.status,
      vin: vehicle.relationshipType
    })),
    glance: [
      { label: "Customer #", value: model.identity.customerNumber, href: model.source.href },
      { label: "Owner", value: model.owner?.name ?? "Unassigned", href: model.source.href },
      { label: "Open cases", value: String(model.sourceLenses.cases.length), href: model.source.href },
      { label: "Opportunities", value: String(opportunityCount), href: model.source.href },
      { label: "Appointments", value: String(model.appointments.length), href: "/appointments" }
    ],
    communications: model.timeline.items.slice(0, 5).map((item) => ({
      id: item.id,
      channel: item.kind.includes("appointment") ? "Appointment" : item.sourceLabel.toLowerCase().includes("email") ? "Email" : "Phone",
      detail: `${item.title}: ${item.detail}`,
      occurredAt: item.occurredAt
    }))
  };
}

function timelineFrom360(model: UnifiedCrmCustomer360ReadModel): CrmNextTimelineEvent[] {
  return model.timeline.items.slice(0, 12).map((item) => ({
    id: item.id,
    source: sourceToCrmNextTimelineSource(item),
    label: item.title,
    detail: `${item.detail} · Source: ${item.sourceLabel}`,
    occurredAt: item.occurredAt,
    href: item.sourceHref,
    sourceRecordId: item.sourceRecordId
  }));
}

function searchGroupsFromUnifiedCrm(search: UnifiedCrmGlobalSearchReadModel): CrmNextSearchGroup[] {
  return search.groups.map((group) => ({
    id: `live-${group.entity}`,
    label: group.label,
    description: group.results.slice(0, 3).map((result) => result.label).join(" · ") || "No matching source records.",
    href: group.results[0]?.href ?? "/crm-next/search",
    count: group.count,
    safety: "Live read-only result from existing Customer search. Open the source record to execute approved work."
  }));
}

function updateSummaryMetric(
  summary: CrmNextSummaryMetric[],
  label: string,
  patch: Partial<CrmNextSummaryMetric>
): CrmNextSummaryMetric[] {
  return summary.map((item) => (item.label === label ? { ...item, ...patch } : item));
}

function todayAppointmentWindow(now: Date) {
  const location = getInitialMinneapolisLocation();
  const localDate = getLocationLocalDate(now, location.timezone);
  return {
    location,
    windowEnd: locationLocalDateMinuteToInstant({
      localDate,
      minuteOfDay: 1440,
      timezone: location.timezone
    }),
    windowStart: locationLocalDateMinuteToInstant({
      localDate,
      minuteOfDay: 0,
      timezone: location.timezone
    })
  };
}

function buildCrmNextEnterpriseLayer(model: CrmNextCommandCenter, now: Date): CrmNextCommandCenter["enterpriseLayer"] {
  const customerFollowUps = model.attention.map((item) => ({
    dueAt: item.level === "High" ? new Date(now.getTime() - 3600000).toISOString() : new Date(now.getTime() + 86400000).toISOString(),
    href: item.workHref,
    id: item.id,
    status: "OPEN",
    title: `${item.customerName}: ${item.reason}`,
  }));
  const promises = model.attention
    .filter((item) => item.reason.toLowerCase().includes("follow-up") || item.reason.toLowerCase().includes("payment"))
    .slice(0, 3)
    .map((item) => ({
      dueAt: item.level === "High" ? new Date(now.getTime() - 7200000).toISOString() : new Date(now.getTime() + 43200000).toISOString(),
      href: item.workHref,
      id: `promise-${item.id}`,
      status: "OPEN",
      title: `Promise check: ${item.customerName}`,
    }));
  const automationRecommendations = evaluateWorkflowAutomationRules({
    appointments: model.sales.appointments.slice(0, 2).map((record, index) => ({
      href: record.href,
      id: `appointment-${record.id}`,
      startAt: index === 0 ? new Date(now.getTime() - 3600000).toISOString() : new Date(now.getTime() + 7200000).toISOString(),
      status: index === 0 ? "SCHEDULED" : "CONFIRMED",
      title: `${record.customerName}: ${record.nextAction}`,
    })),
    carryovers: model.ownershipSupport.slice(0, 2).map((record, index) => ({
      count: index === 0 ? 4 : 2,
      href: record.href,
      id: `carryover-${record.id}`,
      title: record.title,
    })),
    customerFollowUps,
    documents: model.ownershipSupport
      .filter((record) => ["Title/Document", "Insurance"].includes(record.domain))
      .map((record) => ({
        href: record.href,
        id: `document-${record.id}`,
        received: false,
        required: true,
        title: record.title,
      })),
    leads: model.sales.leads.map((record) => ({
      href: record.href,
      id: `lead-${record.id}`,
      lastActivityAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
      status: "OPEN",
      title: `${record.customerName}: ${record.nextAction}`,
    })),
    now,
    promises,
    repairDelays: model.ownershipSupport
      .filter((record) => record.domain === "Service")
      .map((record) => ({
        href: record.href,
        id: `repair-${record.id}`,
        lastCustomerUpdateAt: new Date(now.getTime() - 30 * 3600000).toISOString(),
        targetAt: new Date(now.getTime() - 3600000).toISOString(),
        title: record.title,
        waitingOnParts: true,
      })),
    vehicles: model.ownershipSupport
      .filter((record) => record.domain === "Vehicle")
      .map((record) => ({
        blocked: record.priority === "High",
        href: record.href,
        id: `vehicle-${record.id}`,
        stageEnteredAt: new Date(now.getTime() - 96 * 3600000).toISOString(),
        status: "IN_PROGRESS",
        title: record.title,
      })),
  }).slice(0, 8);

  const supportingParties = [
    buildSupportingPartyContext({
      associations: [
        { href: "/crm-next/ownership-support#documents", partyId: "dmv-minnesota", relationship: "Title and registration follow-up", subjectId: model.customers[0]?.id ?? "customer", subjectTitle: model.customers[0]?.name ?? "Customer record", subjectType: "CUSTOMER" },
        { href: "/crm-next/actions/upload-document", partyId: "dmv-minnesota", relationship: "Document proof", subjectId: "title-packet", subjectTitle: "Title packet review", subjectType: "TASK" },
      ],
      interactions: [
        { channel: "PHONE", direction: "OUTBOUND", followUpAt: new Date(now.getTime() + 86400000).toISOString(), id: "dmv-call-1", occurredAt: new Date(now.getTime() - 86400000).toISOString(), partyId: "dmv-minnesota", reportWorthy: true, sourceHref: "/crm-next/ownership-support#documents", summary: "Confirm whether the title packet is ready or needs correction." },
      ],
      party: { id: "dmv-minnesota", name: "Minnesota DMV", type: "government_agency" },
    }),
    buildSupportingPartyContext({
      associations: [
        { href: "/crm-next/ownership-support#service", partyId: "northside-towing", relationship: "Customer vehicle movement", subjectId: "tow-need", subjectTitle: "Customer tow support", subjectType: "TASK" },
      ],
      interactions: [
        { channel: "SMS", direction: "OUTBOUND", followUpAt: new Date(now.getTime() + 4 * 3600000).toISOString(), id: "tow-text-1", occurredAt: new Date(now.getTime() - 2 * 3600000).toISOString(), partyId: "northside-towing", reportWorthy: true, sourceHref: "/crm-next/actions/log-call", summary: "Confirm pickup window and customer authorization before dispatch." },
      ],
      party: { id: "northside-towing", name: "Northside Towing", type: "towing_company" },
    }),
    buildSupportingPartyContext({
      associations: [
        { href: "/crm-next/ownership-support#insurance", partyId: "metro-warranty", relationship: "Warranty claim status", subjectId: "warranty-claim", subjectTitle: "Warranty claim follow-up", subjectType: "TASK" },
      ],
      interactions: [
        { channel: "EMAIL", direction: "INBOUND", followUpAt: new Date(now.getTime() + 2 * 86400000).toISOString(), id: "warranty-email-1", occurredAt: new Date(now.getTime() - 5 * 3600000).toISOString(), partyId: "metro-warranty", sourceHref: "/crm-next/ownership-support#insurance", summary: "Warranty company requested repair proof and customer authorization." },
      ],
      party: { id: "metro-warranty", name: "Metro Warranty", type: "warranty_company" },
    }),
  ];

  const reportingBrief = buildEnterpriseReportingBrief({
    generatedAt: now,
    sources: [
      ...automationRecommendations.slice(0, 5).map((action) => ({
        createdAt: now.toISOString(),
        detail: action.explanation,
        href: action.href,
        id: action.id,
        kind: "crm_action" as const,
        ownerName: "Customer Console",
        reportTypes: action.targetQueue === "COMPLIANCE_TASK" ? ["compliance" as const] : undefined,
        status: action.severity.toUpperCase(),
        title: action.title,
      })),
      ...supportingParties.flatMap((context) => context.reportSeeds.map((seed) => ({
        createdAt: now.toISOString(),
        detail: seed.text,
        href: seed.sourceHref,
        id: seed.id,
        kind: "report_seed" as const,
        ownerName: context.party.name,
        title: `${context.party.typeLabel}: ${context.party.name}`,
      }))),
    ],
  });

  return {
    adminGuardrails: listEnterpriseAdminControls().slice(0, 5).map((control) => ({
      href: control.href,
      summary: control.summary,
      title: control.title,
    })),
    automationRecommendations,
    reportingBrief,
    supportingParties,
  };
}

function withCustomerListOverlay(
  model: CrmNextCommandCenter,
  customerList: UnifiedCrmCustomerListReadModel,
  now: Date
): CrmNextCommandCenter {
  if (customerList.state === "EMPTY") return model;
  const operationalCustomers = customerList.items.map((item) => crmNextCustomerFromListItem(item, now));
  const operationalAttention = attentionFromCustomerList(customerList.items, now);
  const overdueCount = operationalAttention.filter((item) => item.level === "High").length;
  const customerNames = operationalCustomers.slice(0, 3).map((customer) => customer.name).join(", ");
  let summary = updateSummaryMetric(model.summary, "Needs Attention", {
    source: "Customer next actions",
    trend: "from customer records",
    value: String(operationalAttention.length)
  });
  summary = updateSummaryMetric(summary, "Overdue Follow-ups", {
    source: "Customer next actions",
    trend: overdueCount === 1 ? "requires attention" : "require attention",
    value: String(overdueCount)
  });

  return {
    ...model,
    attention: operationalAttention.length ? operationalAttention : model.attention,
    customers: operationalCustomers.length ? operationalCustomers : model.customers,
    search: {
      ...model.search,
      groups: model.search.groups.map((group) => group.id === "search-customers" ? {
        ...group,
        count: operationalCustomers.length,
        description: customerNames ? `Open the customer list. Latest visible records include ${customerNames}.` : group.description,
        href: CRM_NEXT_CUSTOMERS_HREF
      } : group)
    },
    summary
  };
}

export async function getCrmNextOperationalCommandCenter(
  actor: AuthenticatedUser | null,
  dependencies: CrmNextOperationalReadDependencies = {}
): Promise<CrmNextCommandCenter> {
  const now = dependencies.now?.() ?? new Date();
  const searchQuery = dependencies.searchQuery?.trim() ?? "";
  let model = getCrmNextCommandCenter(actor, now);
  model = {
    ...model,
    search: {
      ...model.search,
      activeQuery: searchQuery
    }
  };
  const statuses: CrmNextSourceReadStatus[] = [];
  const observedAt = now.toISOString();

  try {
    const customerList = await (dependencies.customerListReader ?? getUnifiedCrmCustomerList)(
      actor,
      { limit: CRM_NEXT_CUSTOMER_LIST_LIMIT },
      crmNextCustomerListReadOptions(dependencies.now)
    );
    model = withCustomerListOverlay(model, customerList, now);
    statuses.push(readStatus({
      id: "customers",
      label: "Customer source",
      state: customerList.state === "EMPTY" ? "EMPTY_READ" : "LIVE_READ",
      sourceOfTruth: "Existing customer records",
      detail: customerList.state === "EMPTY" ? "No customer records are visible right now." : `${customerList.items.length} customer records are available.`,
      href: customerList.source.href
    }, customerList.freshness.observedAt));
    statuses.push(readStatus({
      id: "attention",
      label: "Needs Attention",
      state: customerList.state === "EMPTY" ? "EMPTY_READ" : "LIVE_READ",
      sourceOfTruth: "Existing customer next-action dates",
      detail: customerList.state === "EMPTY" ? "No next actions are visible right now." : "Queue priority is based on customer next-action dates.",
      href: "/crm-next/needs-attention"
    }, customerList.freshness.observedAt));
  } catch {
    statuses.push(readStatus({
      id: "customers",
      label: "Customer source",
      state: "FALLBACK_READ",
      sourceOfTruth: "Existing customer records",
      detail: "Customer source is unavailable, gated, or inaccessible; Customer Console is showing protected preview data.",
      href: CRM_NEXT_CUSTOMERS_HREF
    }, observedAt));
  }

  try {
    const search = await (dependencies.searchReader ?? searchUnifiedCrm)(
      actor,
      {
        limit: 12,
        q: searchQuery || "customer"
      },
      crmNextSearchReadOptions(dependencies.now)
    );
    const opportunityCount = search.groups.find((group) => group.entity === "opportunity")?.count;
    model = {
      ...model,
      search: {
        ...model.search,
        groups: search.groups.length ? searchGroupsFromUnifiedCrm(search) : model.search.groups
      },
      summary: typeof opportunityCount === "number"
        ? updateSummaryMetric(model.summary, "Deals in Progress", {
          source: "Opportunity search",
          trend: "matching open records",
          value: String(opportunityCount)
        })
        : model.summary
    };
    statuses.push(readStatus({
      id: "search",
      label: "Customer search",
      state: search.state === "EMPTY" ? "EMPTY_READ" : "LIVE_READ",
      sourceOfTruth: "Existing customer search",
      detail: search.state === "EMPTY" ? "No matching records were found." : `${search.resultCount} grouped results are available.`,
      href: "/crm-next/search"
    }, search.freshness.observedAt));
  } catch {
    statuses.push(readStatus({
      id: "search",
      label: "Customer search",
      state: "FALLBACK_READ",
      sourceOfTruth: "Existing customer search",
      detail: "Search source is unavailable, gated, or inaccessible; Customer Console keeps safe search group fallbacks.",
      href: "/crm-next/search"
    }, observedAt));
  }

  try {
    const leads = await (dependencies.leadReader ?? listRecentCustomerLeads)(actor, 25);
    const activeLeadCount = leads.filter((lead) => !["WON", "LOST"].includes(String(lead.stage))).length;
    model = {
      ...model,
      leadSourceReport: buildLeadSourceReportFromSeeds(leads.map((lead) => ({
        customer: lead.customer.displayName,
        href: `/crm-next/customers/${encodeURIComponent(lead.customer.id)}`,
        nextAction: lead.nextActionCode.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase()),
        source: lead.sourceCode,
        stage: String(lead.stage),
        stale: !["WON", "LOST"].includes(String(lead.stage)) && new Date(lead.nextActionAt).getTime() < now.getTime()
      })), "Live CRM lead/customer source"),
      summary: updateSummaryMetric(model.summary, "Hot Leads", {
        source: "Lead engine",
        trend: "active lead records",
        value: String(activeLeadCount)
      })
    };
  } catch {
    model = {
      ...model,
      summary: updateSummaryMetric(model.summary, "Hot Leads", {
        source: "Lead workspace",
        trend: "No verified lead source",
        value: "No source data available"
      })
    };
  }

  try {
    const appointmentWindow = todayAppointmentWindow(now);
    const appointments = await (dependencies.appointmentReader ?? listAppointmentReadModels)(actor, {
      includeCancelled: false,
      locationId: appointmentWindow.location.id,
      windowEnd: appointmentWindow.windowEnd,
      windowStart: appointmentWindow.windowStart
    });
    model = {
      ...model,
      summary: updateSummaryMetric(model.summary, "Appointments Today", {
        source: "Appointment schedule",
        trend: "scheduled today",
        value: String(appointments.appointmentCount)
      })
    };
  } catch {
    model = {
      ...model,
      summary: updateSummaryMetric(model.summary, "Appointments Today", {
        source: "Appointment board",
        trend: "No verified appointment rollup",
        value: "No source data available"
      })
    };
  }

  try {
    const sales = await (dependencies.salesReader ?? getSalesConsoleReadModel)(actor, { now: () => now });
    const dealSource = sales.dataSources.find((source) => source.source === "Deal visibility");
    if (dealSource?.status === "mapped") {
      model = {
        ...model,
        summary: updateSummaryMetric(model.summary, "Deals in Progress", {
          source: "Deal visibility",
          trend: "active deal records",
          value: String(dealSource.usedRecords)
        })
      };
    }
  } catch {
    model = {
      ...model,
      summary: updateSummaryMetric(model.summary, "Deals in Progress", {
        source: "Sales workspace",
        trend: "No verified deal source",
        value: "No source data available"
      })
    };
  }

  const state = operationalState(statuses);
  return {
    ...model,
    enterpriseLayer: buildCrmNextEnterpriseLayer(model, now),
    operationalRead: {
      state,
      safety: model.mode === "DOGFOOD"
        ? "Customer Console can use existing customer data and create operational Dispatch handoffs. Customer communications, payments, documents, and route replacement stay controlled."
        : "Customer Console can use existing customer data. Customer communications, payments, documents, task creation, and route replacement stay controlled.",
      sources: statuses
    }
  };
}

export async function getCrmNextOperationalCustomer360(
  actor: AuthenticatedUser | null,
  customerId: string,
  dependencies: CrmNextOperationalReadDependencies = {}
): Promise<{ customer: CrmNextCustomer360; model: CrmNextCommandCenter }> {
  let model = await getCrmNextOperationalCommandCenter(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const observedAt = now.toISOString();
  try {
    const customer360 = await (dependencies.customer360Reader ?? getUnifiedCrmCustomer360)(
      actor,
      customerId,
      crmNextCustomer360ReadOptions(dependencies.now)
    );
    const customer = crmNextCustomerFrom360(customer360);
    const sourceStatus = readStatus({
      id: "customer-360",
      label: "Customer 360 detail",
      state: "LIVE_READ",
      sourceOfTruth: "Existing Customer 360",
      detail: "Customer detail, vehicles, appointments, opportunities, cases, and timeline records are available.",
      href: customer360.source.href
    }, customer360.freshness.observedAt);
    const timeline = timelineFrom360(customer360);
    const timelineStatus = readStatus({
      id: "timeline",
      label: "Customer timeline",
      state: customer360.timeline.state === "EMPTY" ? "EMPTY_READ" : "LIVE_READ",
      sourceOfTruth: "Existing customer timeline / ActivityEvent infrastructure",
      detail: customer360.timeline.state === "EMPTY" ? customer360.timeline.emptyMessage : `${customer360.timeline.itemCount} timeline records are available.`,
      href: customer360.source.href
    }, customer360.timeline.freshness.observedAt);
    model = {
      ...model,
      customers: [customer, ...model.customers.filter((record) => record.id !== customer.id)],
      enterpriseLayer: buildCrmNextEnterpriseLayer({
        ...model,
        customers: [customer, ...model.customers.filter((record) => record.id !== customer.id)],
        timeline,
      }, now),
      timeline,
      operationalRead: {
        ...model.operationalRead,
        state: operationalState([...model.operationalRead.sources, sourceStatus, timelineStatus]),
        sources: [...model.operationalRead.sources, sourceStatus, timelineStatus]
      }
    };
    return { customer, model };
  } catch {
    const fallbackCustomer = model.customers.find((customer) => customer.id === customerId) ?? unavailableCustomer(customerId);
    model = {
      ...model,
      operationalRead: {
        ...model.operationalRead,
        state: operationalState([
          ...model.operationalRead.sources,
          readStatus({
            id: "customer-360",
            label: "Customer 360 detail",
            state: "FALLBACK_READ",
            sourceOfTruth: "Existing Customer 360",
            detail: "Customer details are unavailable or the record was not found. Customer Console is showing a safe fallback.",
            href: CRM_NEXT_CUSTOMERS_HREF
          }, observedAt)
        ]),
        sources: [
          ...model.operationalRead.sources,
          readStatus({
            id: "customer-360",
            label: "Customer 360 detail",
            state: "FALLBACK_READ",
            sourceOfTruth: "Existing Customer 360",
            detail: "Customer details are unavailable or the record was not found. Customer Console is showing a safe fallback.",
            href: CRM_NEXT_CUSTOMERS_HREF
          }, observedAt)
        ]
      }
    };
    return { customer: fallbackCustomer, model };
  }
}

function unavailableCustomer(customerId: string): CrmNextCustomer360 {
  return {
    id: customerId || "customer-record-unavailable",
    name: "Customer record unavailable",
    status: "Active",
    phone: "No source data available",
    email: "No source data available",
    address: "No source data available",
    customerSince: "No source data available",
    lifetimeValue: "No source data available",
    vehiclesOwned: 0,
    openDeals: 0,
    openCases: 0,
    dealPrefill: emptyDealPrefill(),
    riskLevel: "Low",
    nextAction: "Open Customer 360 from a verified customer record.",
    vehicles: [],
    glance: [],
    communications: []
  };
}

function unavailableAttentionItem(itemId: string): CrmNextAttentionItem {
  const customerId = itemId || "customer-record-unavailable";
  return {
    id: itemId || "attention-record-unavailable",
    customerId,
    customerName: "Customer record unavailable",
    reason: "No source data available",
    age: "Unknown",
    area: "Support",
    owner: "Unassigned",
    level: "Low",
    nextAction: "Open Customer 360 from a verified customer record.",
    workHref: "/crm-next/needs-attention",
    customerHref: `/crm-next/customers/${encodeURIComponent(customerId)}`
  };
}

export function getCrmNextCommandCenter(actor: AuthenticatedUser | null, now: Date = new Date()): CrmNextCommandCenter {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    throw Object.assign(new Error("Customer Console is not enabled for this user."), { code: access.reason });
  }
  const activeMode: Exclude<CrmNextMode, "OFF"> = access.mode === "DOGFOOD" ? "DOGFOOD" : "REVIEW";
  const dogfoodMode = activeMode === "DOGFOOD";

  return {
    contractVersion: "crm-next-command-center/v1",
    generatedAt: now.toISOString(),
    userId: actor?.id ?? "",
    userName: actor?.name ?? "CRM user",
    mode: activeMode,
    summary: [
      { href: "/crm-next/needs-attention", label: "Needs Attention", source: "Customer next actions", value: "No source data available", trend: "No verified customer work source", tone: "blue" },
      { href: "/crm-next/pipeline", label: "Hot Leads", source: "Lead engine", value: "No source data available", trend: "No verified lead source", tone: "red" },
      { href: "/appointments", label: "Appointments Today", source: "Appointment schedule", value: "No source data available", trend: "Open appointment console", tone: "green" },
      { href: "/crm-next/deals", label: "Deals in Progress", source: "Deal visibility", value: "No source data available", trend: "No verified deal source", tone: "green" },
      { href: "/crm-next/needs-attention", label: "Overdue Follow-ups", source: "Customer next actions", value: "No source data available", trend: "No verified overdue source", tone: "red" }
    ],
    attention: [],
    pipeline: [],
    revenue: { monthToDate: "No source data available", trend: "No verified revenue source" },
    nextActions: [],
    customers: [],
    search: {
      activeQuery: "",
      queryPlaceholder: "Search customers, vehicles, deals, communications, work...",
      groups: searchGroups
    },
    timeline: timelineEvents,
    sales: {
      leads: [],
      opportunities: [],
      appointments: [],
      testDrives: [],
      deals: []
    },
    ownershipSupport: ownershipSupportRecords,
    sharedExecution: sharedExecutionRecords,
    intelligence: intelligenceRecords,
    leadSourceReport: buildLeadSourceReportFromSales([]),
    commandCenter: {
      headline: "Who needs attention?",
      guidance: "A compact command center for reviewing customer pressure, next actions, team load, pipeline context, and safe handoffs.",
      modes: commandCenterModes
    },
    pilotScenarios,
    hardeningGates,
    coexistenceGates,
    pilotReleaseGates,
    operatingActions,
    enterpriseLayer: {
      adminGuardrails: [],
      automationRecommendations: [],
      reportingBrief: buildEnterpriseReportingBrief({ generatedAt: now, sources: [] }),
      supportingParties: [],
    },
    bridge: {
      liveTaskCreationEnabled: dogfoodMode,
      previewEnabled: true,
      message: dogfoodMode
        ? "Customer Console can create operational Dispatch handoffs."
        : "Task creation is not available in this mode."
    },
    operationalRead: {
      state: "FALLBACK_READ",
      safety: "Customer Console is showing fallback customer data until live records are available for this user.",
      sources: [
        {
          id: "customers",
          label: "Customer source",
          state: "FALLBACK_READ",
          sourceOfTruth: "Existing Customers / Customer records",
          detail: "Protected preview data is displayed by the base Customer Console read model.",
          observedAt: now.toISOString(),
          href: CRM_NEXT_CUSTOMERS_HREF
        }
      ]
    },
    progress: {
      completedCount: allProgressMilestones.filter((milestone) => ["IMPLEMENTED_UNVERIFIED", "VERIFIED"].includes(milestone.status)).length,
      envelopeCount: 29,
      verifiedCount: allProgressMilestones.filter((milestone) => milestone.status === "VERIFIED").length,
      heldCount: allProgressMilestones.filter((milestone) => milestone.status === "HELD").length,
      nextMilestone: "CRMN-150 proof bundle",
      milestones: allProgressMilestones
    }
  };
}

export function getCrmNextCustomer360(actor: AuthenticatedUser | null, customerId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.customers.find((customer) => customer.id === customerId) ?? unavailableCustomer(customerId);
}

export function getCrmNextAttentionItem(actor: AuthenticatedUser | null, itemId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.attention.find((item) => item.id === itemId) ?? unavailableAttentionItem(itemId);
}

export function getCrmNextOperatingAction(actor: AuthenticatedUser | null, actionId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.operatingActions.find((action) => action.id === actionId) ?? model.operatingActions[0];
}
