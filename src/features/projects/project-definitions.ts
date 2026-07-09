import {
  CarFront,
  Briefcase,
  CircleAlert,
  FileCheck2,
  FolderKanban,
  type LucideIcon,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Wrench
} from "lucide-react";

export type ProjectView =
  | "overview"
  | "list"
  | "board"
  | "timeline"
  | "workflow"
  | "calendar"
  | "dashboard"
  | "messages"
  | "files";

export type ProjectStage = {
  label: string;
  keywords: string[];
};

export type ProjectDefinition = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  workflowAreas: string[];
  icon: LucideIcon;
  accent: string;
  stages: ProjectStage[];
};

export const projectViewOptions: Array<{ value: ProjectView; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "list", label: "List" },
  { value: "board", label: "Board" },
  { value: "timeline", label: "Timeline" },
  { value: "workflow", label: "Workflow" },
  { value: "calendar", label: "Calendar" },
  { value: "dashboard", label: "Dashboard" },
  { value: "messages", label: "Messages" },
  { value: "files", label: "Files" }
];

export const projectDefinitions: ProjectDefinition[] = [
  {
    slug: "inventory-management",
    name: "Inventory Management",
    shortName: "Inventory",
    description: "Track purchased vehicles through frontline readiness and sale prep.",
    workflowAreas: ["INVENTORY"],
    icon: FolderKanban,
    accent: "blue",
    stages: [
      { label: "Purchased", keywords: ["purchase", "purchased", "acquired"] },
      { label: "Inspection", keywords: ["inspection", "inspect"] },
      { label: "Repairs", keywords: ["repair", "recon", "mechanic"] },
      { label: "Detail", keywords: ["detail", "clean"] },
      { label: "Photos", keywords: ["photo", "photos", "video"] },
      { label: "Listing", keywords: ["listing", "list", "publish"] },
      { label: "Ready for Sale", keywords: ["ready for sale", "frontline", "sale ready"] }
    ]
  },
  {
    slug: "service-repair-shop",
    name: "Service / Repair Shop",
    shortName: "Shop",
    description: "Keep intake, diagnostic work, repairs, parts, and QC moving without surprises.",
    workflowAreas: ["SHOP"],
    icon: Wrench,
    accent: "orange",
    stages: [
      { label: "Intake", keywords: ["intake", "drop off"] },
      { label: "Diagnostic", keywords: ["diagnostic", "diagnose"] },
      { label: "Waiting Approval", keywords: ["approval", "approve"] },
      { label: "Waiting Parts", keywords: ["parts", "part"] },
      { label: "In Repair", keywords: ["repair", "repairing", "fix"] },
      { label: "QC / Ready Review", keywords: ["qc", "review", "ready"] },
      { label: "Completed", keywords: ["completed", "complete", "done"] }
    ]
  },
  {
    slug: "advertising-marketing",
    name: "Advertising & Marketing",
    shortName: "Advertising",
    description: "Own photos, listing quality, publishing, and campaign momentum.",
    workflowAreas: ["ADVERTISING", "MARKETING"],
    icon: Megaphone,
    accent: "purple",
    stages: [
      { label: "Ready for Photos", keywords: ["ready for photo", "photo ready"] },
      { label: "Photos / Video", keywords: ["photo", "video"] },
      { label: "Listing Draft", keywords: ["draft", "listing draft"] },
      { label: "Published", keywords: ["published", "publish", "listing complete"] },
      { label: "Needs Info", keywords: ["needs info", "missing info", "missing"] },
      { label: "Campaign Active", keywords: ["campaign", "marketing", "social", "advertising"] }
    ]
  },
  {
    slug: "sales",
    name: "Sales",
    shortName: "Sales",
    description: "Keep leads, appointments, test drives, negotiation, and delivery steps visible.",
    workflowAreas: ["SALES"],
    icon: ShoppingCart,
    accent: "green",
    stages: [
      { label: "New Lead", keywords: ["new lead", "lead"] },
      { label: "Contacted", keywords: ["contact", "follow up"] },
      { label: "Appointment", keywords: ["appointment"] },
      { label: "Test Drive", keywords: ["test drive"] },
      { label: "Negotiation", keywords: ["negotiation", "deal"] },
      { label: "Sold / Delivery", keywords: ["sold", "delivery"] }
    ]
  },
  {
    slug: "documentation-compliance",
    name: "Documentation / Compliance",
    shortName: "Documentation",
    description: "Watch missing paperwork, DMV/title steps, registrations, and corrections.",
    workflowAreas: ["ADMIN", "GENERAL_MANAGER"],
    icon: FileCheck2,
    accent: "slate",
    stages: [
      { label: "Missing Docs", keywords: ["doc", "docs", "missing", "paperwork"] },
      { label: "DMV Submitted", keywords: ["dmv", "submitted"] },
      { label: "Awaiting Title / Registration", keywords: ["title", "registration"] },
      { label: "Correction Needed", keywords: ["correction", "fix", "issue"] },
      { label: "Filed", keywords: ["filed", "completed", "complete"] }
    ]
  },
  {
    slug: "administration-office",
    name: "Administration / Office",
    shortName: "Administration",
    description: "Handle front-desk work, customer issues, office coordination, and bills.",
    workflowAreas: ["ADMIN"],
    icon: Briefcase,
    accent: "amber",
    stages: [
      { label: "Calls", keywords: ["call", "phone"] },
      { label: "Walk-ins", keywords: ["walk in", "walk-in", "guest"] },
      { label: "Customer Issues", keywords: ["customer issue", "complaint", "issue"] },
      { label: "DMV / Title", keywords: ["dmv", "title"] },
      { label: "Paperwork", keywords: ["paperwork", "documents"] },
      { label: "Vendor / Bills", keywords: ["vendor", "bill", "invoice"] },
      { label: "Complete", keywords: ["complete", "completed", "done"] }
    ]
  },
  {
    slug: "collections",
    name: "Collections",
    shortName: "Collections",
    description: "Monitor due-today follow-up, payment promises, arrangements, and escalations.",
    workflowAreas: ["COLLECTIONS"],
    icon: ReceiptText,
    accent: "red",
    stages: [
      { label: "Due Today", keywords: ["due today", "due"] },
      { label: "Contacted", keywords: ["contacted", "called"] },
      { label: "Promise to Pay", keywords: ["promise to pay", "promise"] },
      { label: "Arrangement", keywords: ["arrangement", "payment plan"] },
      { label: "Paid", keywords: ["paid", "payment received"] },
      { label: "Escalate", keywords: ["escalate", "urgent"] }
    ]
  },
  {
    slug: "customer-issues",
    name: "Customer Issues",
    shortName: "Issues",
    description: "Escalate complaints, save deals, and keep resolution work visible.",
    workflowAreas: ["ADMIN", "SALES", "GENERAL_MANAGER"],
    icon: CircleAlert,
    accent: "red",
    stages: [
      { label: "Reported", keywords: ["issue", "complaint", "reported"] },
      { label: "Investigating", keywords: ["investigating", "research", "review"] },
      { label: "Waiting Response", keywords: ["waiting", "response", "follow up"] },
      { label: "Resolved", keywords: ["resolved", "complete", "completed"] }
    ]
  },
  {
    slug: "rentals-loaners",
    name: "Rentals / Loaners",
    shortName: "Loaners",
    description: "Track loaner readiness, handoff, return, and service follow-through.",
    workflowAreas: ["SERVICE", "SHOP", "ADMIN"],
    icon: CarFront,
    accent: "blue",
    stages: [
      { label: "Requested", keywords: ["rental", "loaner", "requested"] },
      { label: "Ready", keywords: ["ready", "prepared"] },
      { label: "Out", keywords: ["checked out", "out"] },
      { label: "Return / Inspect", keywords: ["return", "inspect"] }
    ]
  },
  {
    slug: "management-review",
    name: "Management Review",
    shortName: "Review",
    description: "Keep approvals, escalations, and leadership follow-up in one lane.",
    workflowAreas: ["GENERAL_MANAGER", "ADMIN"],
    icon: ShieldCheck,
    accent: "slate",
    stages: [
      { label: "Needs Review", keywords: ["review", "manager review", "approval"] },
      { label: "Waiting Decision", keywords: ["decision", "waiting approval"] },
      { label: "Approved", keywords: ["approved"] },
      { label: "Closed", keywords: ["closed", "complete", "completed"] }
    ]
  }
];

const projectDefinitionBySlug = new Map(projectDefinitions.map((project) => [project.slug, project]));

export function getProjectDefinition(projectSlug: string) {
  return projectDefinitionBySlug.get(projectSlug) ?? null;
}

export function isProjectView(value: string): value is ProjectView {
  return projectViewOptions.some((option) => option.value === value);
}
