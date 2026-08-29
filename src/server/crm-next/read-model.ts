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
    status: "CONTRACTED",
    objective: "Make CRM Next navigation obvious across Command Center, Customer 360, Work Customer, and Progress.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Next planned slice.",
    safety: "Navigation-only; no writes."
  },
  {
    id: "CRMN-018",
    title: "Safe global search shell",
    status: "PLANNED",
    objective: "Create the search experience before connecting live sources.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Contract-first search shell pending.",
    safety: "No broad data exposure until policies are connected."
  },
  {
    id: "CRMN-019",
    title: "Grouped search results",
    status: "PLANNED",
    objective: "Group results by customer, vehicle, deal, communication, and work.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on CRMN-018.",
    safety: "Permission filtering required before real data."
  },
  {
    id: "CRMN-020",
    title: "Dynamic customer overview",
    status: "PLANNED",
    objective: "Show the most relevant customer situation without hiding the full record.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on customer read model review.",
    safety: "Read-only prominence rules."
  },
  {
    id: "CRMN-021",
    title: "70/30 Workbench refinement",
    status: "PLANNED",
    objective: "Refine Work Customer into a focused execution pane plus context rail.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on CRMN-014 feedback.",
    safety: "No live actions without bridge approval."
  },
  {
    id: "CRMN-022",
    title: "Universal action bar",
    status: "PLANNED",
    objective: "Standardize Call, Text, Email, Appointment, Task, and More controls.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on communication and task policy contracts.",
    safety: "Disabled/preview actions must explain why."
  },
  {
    id: "CRMN-023",
    title: "Open-items context rail",
    status: "PLANNED",
    objective: "Summarize open cases, deals, appointments, documents, and dispatch work.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Read-model adapters pending.",
    safety: "Source-of-truth boundaries preserved."
  },
  {
    id: "CRMN-024",
    title: "Activity interaction read model",
    status: "PLANNED",
    objective: "Prepare a unified timeline without creating duplicate source records.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Unified timeline mapping pending.",
    safety: "Timeline events stay source-linked."
  },
  {
    id: "CRMN-025",
    title: "Responsive/mobile behavior",
    status: "PLANNED",
    objective: "Make the review flow usable on tablet/mobile.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Responsive proof pending.",
    safety: "No horizontal overflow or buried primary actions."
  },
  {
    id: "CRMN-026",
    title: "Empty/loading/error states",
    status: "PLANNED",
    objective: "Make every blocked or missing state explain what the user can do next.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "State coverage pending.",
    safety: "No private error/data leakage."
  },
  {
    id: "CRMN-027",
    title: "Permission-denied surfaces",
    status: "PLANNED",
    objective: "Show safe denial states for unauthorized users.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Policy UX pending.",
    safety: "Fail closed."
  },
  {
    id: "CRMN-028",
    title: "Legacy switch/fallback links",
    status: "PLANNED",
    objective: "Make switching between CRM Next and Legacy/current CRM obvious during pilot.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Fallback navigation review pending.",
    safety: "Legacy remains operational."
  },
  {
    id: "CRMN-029",
    title: "Route and rollback proof",
    status: "PLANNED",
    objective: "Prove CRM Next can be disabled without harming existing workspaces.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Rollback tests pending.",
    safety: "CRM_NEXT off returns to safe workspaces."
  },
  {
    id: "CRMN-030",
    title: "Lead/opportunity read adapters",
    status: "PLANNED",
    objective: "Prepare lead and opportunity read models for CRM Next.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Adapters pending.",
    safety: "Read-only until lifecycle approvals."
  },
  {
    id: "CRMN-031",
    title: "Pipeline read-only board",
    status: "PLANNED",
    objective: "Show a real governed pipeline review surface.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on CRMN-030.",
    safety: "No stage mutation."
  },
  {
    id: "CRMN-032",
    title: "Appointments integration",
    status: "PLANNED",
    objective: "Surface appointment context from the existing appointment workspace.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Read bridge pending.",
    safety: "Appointment source remains authoritative."
  },
  {
    id: "CRMN-033",
    title: "Test-drive review surface",
    status: "PLANNED",
    objective: "Expose test-drive context in Customer 360 and Work Customer.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on sales/appointment source mapping.",
    safety: "Review-only until test-drive commands are approved."
  },
  {
    id: "CRMN-034",
    title: "Deal review surface",
    status: "PLANNED",
    objective: "Show deal state, amount, owner, and next action clearly.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on opportunity/deal adapters.",
    safety: "No deal mutation."
  },
  {
    id: "CRMN-035",
    title: "Sales timeline events",
    status: "PLANNED",
    objective: "Add sales events to the unified customer timeline.",
    reviewHref: "/crm-next/progress#crm-next-envelope",
    evidence: "Depends on CRMN-024 and CRMN-030.",
    safety: "Events remain source-linked and read-only."
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
      nextMilestone: "CRMN-017",
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
