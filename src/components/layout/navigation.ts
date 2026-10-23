import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CarFront,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  FileText,
  ContactRound,
  FolderKanban,
  Gauge,
  Globe,
  House,
  Landmark,
  ListChecks,
  Megaphone,
  PackageCheck,
  RefreshCw,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Stethoscope,
  UserRoundCheck,
  Users,
  Wrench,
  type LucideIcon
} from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { CRM_CUSTOMER_LANDING_HREF, CRM_NEXT_CUSTOMERS_HREF, CRM_NEXT_HOME_HREF } from "@/features/crm/crm-route-authority";
import {
  canOpenDispatchBoard,
  getPermittedWorkspaces,
  getWorkspaceKey,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import { canManageSettings, isManager } from "@/server/policies/access";
import { canOpenWebsiteConsole } from "@/features/website-console/policy";

export type NavigationItem = {
  activePaths?: string[];
  activeQuery?: Record<string, string | null>;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  isNested?: boolean;
  matchExact?: boolean;
  parentHref?: string;
  isVisible?(user: AuthenticatedUser): boolean;
};

export type NavigationGroup = { label: string; items: NavigationItem[] };

const dispatchBoardNavigationItem: NavigationItem = {
  href: "/board",
  title: "Dispatch Board",
  description: "Today’s operating command, exceptions, and board readiness.",
  icon: Gauge,
  badge: "Live",
  matchExact: true,
  isVisible: canOpenDispatchBoard
};

export const appointmentConsoleNavigationItems: NavigationItem[] = [
  {
    href: "/appointments",
    title: "Today Flow",
    description: "Arrivals, confirmations, follow-ups, and appointment work that needs action now.",
    icon: Clock3,
    matchExact: true,
    activeQuery: { action: null, section: null, view: null, workspace: null }
  },
  {
    href: "/appointments?action=new",
    title: "Calendar",
    description: "Calendar-first appointment creation with capacity context.",
    icon: CalendarDays,
    activeQuery: { action: "new" }
  },
  {
    href: "/appointments?section=planning",
    title: "Planning Hub",
    description: "Shop capacity, staffing, bay availability, and promise confidence.",
    icon: BarChart3,
    activeQuery: { section: "planning" }
  },
  {
    href: "/appointments?section=operations",
    title: "Operations",
    description: "Appointment operations, check-ins, no-shows, and day-of movement.",
    icon: BriefcaseBusiness,
    activeQuery: { section: "operations" }
  },
  {
    href: "/appointments?section=follow-up",
    title: "Follow-up",
    description: "Confirmation calls, reminders, reschedules, and customer callbacks.",
    icon: UserRoundCheck,
    activeQuery: { section: "follow-up" }
  },
  {
    href: "/appointments?section=intelligence",
    title: "Intelligence",
    description: "Appointment patterns, load signals, risk, and recommendation context.",
    icon: Gauge,
    activeQuery: { section: "intelligence" }
  },
  {
    href: "/appointments?section=exceptions",
    title: "Exceptions",
    description: "Overbooking, conflicts, stale drafts, no-shows, and manager attention.",
    icon: AlertTriangle,
    badge: "2",
    activeQuery: { section: "exceptions" }
  },
  {
    href: "/appointments?view=board#reports",
    title: "Reports",
    description: "Appointment reporting and schedule performance.",
    icon: BarChart3
  },
  {
    href: "/appointments?view=board#automation",
    title: "Automation",
    description: "Reminder automation, routing, and appointment workflow controls.",
    icon: Settings
  },
  {
    href: "/settings/appointments/catalog",
    title: "Templates & Rules",
    description: "Appointment purposes, templates, scheduling rules, and policy setup.",
    icon: CalendarDays
  }
];

export const dispatchNavigationItems: NavigationItem[] = [
  {
    href: "/board",
    title: "Overview",
    description: "Daily readiness, workload, and manager attention.",
    icon: ClipboardCheck,
    parentHref: "/board",
    matchExact: true,
    activeQuery: { view: null }
  },
  {
    href: "/board?view=live",
    title: "Live Board",
    description: "Operate and update today’s work.",
    icon: ListChecks,
    parentHref: "/board"
  },
  {
    href: "/my-tasks",
    title: "My Tasks",
    description: "Your assigned work and next actions.",
    icon: UserRoundCheck,
    parentHref: "/board"
  },
  {
    href: "/tasks",
    title: "Tasks",
    description: "Search, organize, and manage Dispatch work.",
    icon: SquareCheckBig,
    parentHref: "/board",
    activeQuery: { department: null }
  },
  {
    href: "/projects",
    title: "Projects",
    description: "Dispatch projects and operational work areas.",
    icon: FolderKanban,
    parentHref: "/board"
  },
  {
    href: "/appointments",
    title: "Appointments",
    description: "Appointment schedule and customer commitments.",
    icon: CalendarDays,
    parentHref: "/board"
  },
  {
    href: "/vehicles",
    title: "Vehicles",
    description: "Vehicle records and operational status.",
    icon: CarFront,
    parentHref: "/board"
  },
  {
    href: "/vehicles/coo-workbook",
    title: "COO Workbook",
    description: "Daily operating checklist, review-before-approval context, and report draft workspace.",
    icon: ClipboardList,
    parentHref: "/board"
  },
  {
    href: "/diagnostics",
    title: "Diagnostics",
    description: "Technician case queue, concern triage, and diagnostic execution.",
    icon: Stethoscope,
    parentHref: "/board",
    activePaths: ["/diagnostics/cases"],
    matchExact: true
  },
  {
    href: "/diagnostics/labor-guide",
    title: "Labor Guide",
    description: "Enterprise labor intelligence, estimate draft preparation, overlap, rate, and GP safeguards.",
    icon: BookOpen,
    isNested: true,
    parentHref: "/diagnostics"
  },
  {
    href: "/diagnostics/advisor-review",
    title: "Advisor Review",
    description: "Review diagnosis-to-estimate drafts, handoff packets, customer language, and approval holds.",
    icon: FileText,
    isNested: true,
    parentHref: "/diagnostics"
  },
  {
    href: "/diagnostics/autobody-estimate",
    title: "Autobody Estimate",
    description: "Photo intake, damage mapping, insurance-quality bodywork drafts, supplements, and ADAS gates.",
    icon: CarFront,
    isNested: true,
    parentHref: "/diagnostics"
  },
  {
    href: CRM_CUSTOMER_LANDING_HREF,
    title: "Customers",
    description: "Customer landing dashboard wired into Customer Console.",
    icon: ContactRound,
    parentHref: "/board",
    activePaths: ["/customers"]
  },
  {
    href: CRM_NEXT_HOME_HREF,
    title: "CRM",
    description: "Customer relationships, work, pipeline, conversations, and insight.",
    icon: ContactRound,
    parentHref: "/board",
    activePaths: ["/crm", "/crm-next"],
    isVisible: (user) => getPermittedWorkspaces(user).some(
      (workspace) => workspace.key === "MANAGEMENT" || workspace.key === "SALES"
    )
  },
  {
    href: "/sales",
    title: "Sales",
    description: "Enterprise sales console for leads, deal desk, inventory intelligence, and manager command.",
    icon: BadgeDollarSign,
    parentHref: "/board",
    activePaths: ["/sales"]
  },
  {
    href: "/growth",
    title: "Growth",
    description: "Marketing and advertising command center for campaigns, audiences, approvals, and results.",
    icon: Megaphone,
    parentHref: "/board",
    activePaths: ["/growth"]
  },
  {
    href: "/tasks?department=MARKETING",
    title: "Marketing",
    description: "Marketing campaigns, content, and audience work.",
    icon: Megaphone,
    isNested: true,
    parentHref: "/tasks?department=SALES",
    activeQuery: { department: "MARKETING" }
  },
  {
    href: "/tasks?department=ADVERTISING",
    title: "Advertising",
    description: "Vehicle listings, paid promotion, and advertising work.",
    icon: Megaphone,
    isNested: true,
    parentHref: "/tasks?department=SALES",
    activeQuery: { department: "ADVERTISING" }
  },
  {
    href: "/manager-review",
    title: "Manager Review",
    description: "Approvals, exceptions, and work awaiting review.",
    icon: ShieldCheck,
    parentHref: "/board",
    isVisible: (user) => isManager(user)
  },
  {
    href: "/reports",
    title: "Reports",
    description: "Daily, weekly, monthly reports, reviews, and saved reporting history.",
    icon: BarChart3,
    parentHref: "/board"
  },
  {
    href: "/staff",
    title: "Team",
    description: "Team duties and execution context.",
    icon: Users,
    parentHref: "/board"
  },
  {
    href: "/activity",
    title: "Activity",
    description: "Recorded Dispatch events and updates.",
    icon: Activity,
    parentHref: "/board"
  },
];

const technicianNavigationItems: NavigationItem[] = [
  {
    href: "/my-tasks",
    title: "My Work",
    description: "Current repairs, assigned work, and next actions.",
    icon: UserRoundCheck,
    activePaths: ["/vehicles/repair-jobs"],
    matchExact: true
  },
  {
    href: "/my-tasks/available",
    title: "Available Work",
    description: "Eligible work that is ready to claim.",
    icon: BriefcaseBusiness
  },
  {
    href: "/diagnostics",
    title: "Diagnostics & Tools",
    description: "Troubleshooting cases, guided tests, and technical tools.",
    icon: Stethoscope,
    activePaths: ["/diagnostics"]
  }
];

const workspaceNavigationItems: Partial<Record<WorkspaceKey, NavigationItem[]>> = {
  VEHICLE_OPERATIONS_LEAD: [
    { href: "/vehicles?workspace=vehicle-operations-lead", title: "Operations Home", description: "Inventory, shop, parts, and lot priorities in one vehicle-operations view.", icon: House, matchExact: true },
    { href: "/vehicles/coo-workbook", title: "Vehicle Operations Lead Workbook", description: "Daily operating checklist, review-before-approval context, and report draft workspace.", icon: ClipboardList },
    { href: "/my-tasks?workspace=vehicle-operations-lead", title: "My Vehicle Work", description: "Assigned vehicle operations work and next actions.", icon: UserRoundCheck },
    { href: "/vehicles/inventory", title: "Inventory Flow", description: "Move units through acquisition, recon, merchandising, and readiness.", icon: RefreshCw },
    { href: "/vehicles/recon-repair-advisor", title: "Recon / Repair Advisor", description: "One repair and recon workspace for blockers, parts, vendors, QC, and next action.", icon: Wrench, activePaths: ["/vehicles/shop-recon"] },
    { href: "/vehicles/outside-vendors", title: "Outside Vendors", description: "Vendor profiles, offsite work, billing readiness, and QC accountability.", icon: Building2 },
    { href: "/vehicles/parts-operations", title: "Parts Runner", description: "Parts demand, pickup, receiving, returns, and constrained work.", icon: BriefcaseBusiness },
    { href: "/vehicles/workflows/add-vehicle", title: "Receive Vehicle", description: "Start vehicle intake, custody, keys, photos, and lot placement.", icon: CarFront },
    { href: "/manager-review?scope=inventory", title: "Exceptions", description: "Inventory and shop exceptions requiring lead review.", icon: ShieldCheck }
  ],
  SERVICE: [
    { href: "/vehicles/coo-workbook", title: "Service Operations Workbook", description: "Daily operating checklist and review-before-approval context.", icon: ClipboardList },
    { href: "/vehicles/recon-repair-advisor", title: "Recon / Repair Advisor", description: "One repair and recon workspace for blockers, parts, vendors, QC, and next action.", icon: Wrench, activePaths: ["/vehicles/shop-recon"] },
    { href: "/vehicles/outside-vendors", title: "Outside Vendors", description: "Vendor jobs, estimates, invoice follow-up, and return/QC status.", icon: Building2 },
    { href: "/vehicles/claims-desk", title: "Claims Desk", description: "Start, find, or resume insurance claims before opening the claim workspace.", icon: ClipboardList, activePaths: ["/vehicles/claims-desk", "/vehicles/claims-workspace"] },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Open and coordinate governed repair orders.", icon: ClipboardCheck },
    { href: "/vehicles/shop-dispatch", title: "Shop Dispatch", description: "Assign authorized repair work and manage bays.", icon: ListChecks },
    { href: "/vehicles/parts-operations", title: "Parts Operations", description: "Review parts readiness and constrained work.", icon: BriefcaseBusiness },
    { href: "/vehicles/quality-control", title: "Quality Control", description: "Review completion, rework, and release readiness.", icon: ShieldCheck },
    { href: "/manager-review?scope=inventory", title: "Reviews", description: "Open service exceptions and governed decisions.", icon: SquareCheckBig }
  ],
  INVENTORY: [
    { href: "/vehicles", title: "Inventory Home", description: "Inventory operating picture and priority work.", icon: House, matchExact: true },
    { href: "/vehicles/coo-workbook", title: "Inventory Workbook", description: "Daily operating checklist and cross-workspace report draft.", icon: ClipboardList },
    { href: "/vehicles/inventory", title: "Inventory Lifecycle", description: "Acquisition through sale, transfer, or disposition.", icon: RefreshCw },
    { href: "/vehicles/recon-repair-advisor", title: "Recon / Repair Advisor", description: "Inventory recon status, blockers, repair readiness, and next action.", icon: Wrench, activePaths: ["/vehicles/shop-recon"] },
    { href: "/vehicles/outside-vendors", title: "Outside Vendors", description: "Offsite partner work, billing readiness, and vendor performance.", icon: Building2 },
    { href: "/vehicles/parts-operations", title: "Parts Readiness", description: "Parts demand affecting inventory completion.", icon: BriefcaseBusiness },
    { href: "/manager-review?scope=inventory", title: "Reviews", description: "Inventory work awaiting review or approval.", icon: ShieldCheck }
  ],
  ADVISOR: [
    { href: "/vehicles/advisor", title: "Advisor Home", description: "Arrivals, check-ins, repair-order handoffs, and customer follow-up.", icon: House, matchExact: true },
    { href: "/vehicles/coo-workbook", title: "Service Advisor Workbook", description: "Daily operating checklist, accountability review, and report draft.", icon: ClipboardList },
    { href: "/vehicles/recon-repair-advisor", title: "Recon/Repair Advisor", description: "Prototype cockpit for recon and repair execution.", icon: Stethoscope },
    { href: "/vehicles/repair-orders?intakeSource=WALK_IN", title: "Check In Vehicle", description: "Receive a vehicle and create governed shop work.", icon: ClipboardCheck },
    { href: "/vehicles/claims-desk", title: "Claims Desk", description: "Start, find, or resume insurance claims before opening the claim workspace.", icon: ClipboardList, activePaths: ["/vehicles/claims-desk", "/vehicles/claims-workspace"] },
    { href: "/appointments?view=board", title: "Appointment Board", description: "Review schedule commitments and appointment context.", icon: CalendarDays },
    { href: CRM_NEXT_CUSTOMERS_HREF, title: "Customers", description: "Customer records and connected service work.", icon: ContactRound, activePaths: ["/customers"] },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Open estimates, authorizations, and customer handoffs.", icon: Wrench },
    { href: "/diagnostics/advisor-review", title: "Diagnostic Review", description: "Review findings and estimate handoffs.", icon: FileText },
    { href: "/my-tasks", title: "My Work", description: "Advisor follow-up and assigned actions.", icon: UserRoundCheck }
  ],
  TECHNICIAN: technicianNavigationItems,
  PARTS: [
    { href: "/vehicles/parts-operations", title: "Parts Home", description: "Direct parts work, demand, receiving, returns, and readiness.", icon: House, matchExact: true },
    { href: "/vehicles/parts-operations?view=demand", title: "Demand Queue", description: "Repair-linked demand that needs sourcing, reservation, or issue.", icon: BriefcaseBusiness },
    { href: "/vehicles/parts-receiving", title: "Receive Parts", description: "Front-desk-friendly receiving, inspection, and placement.", icon: PackageCheck },
    { href: "/vehicles/parts-counter", title: "Parts Counter", description: "Find and process authorized part activity.", icon: ListChecks },
    { href: "/my-tasks", title: "My Work", description: "Assigned parts actions and follow-up.", icon: UserRoundCheck }
  ],
  QUALITY: [
    { href: "/vehicles/quality-control", title: "QC Queue", description: "Assigned inspections and release decisions.", icon: ShieldCheck },
    { href: "/my-tasks", title: "My Work", description: "Assigned quality and rework actions.", icon: UserRoundCheck },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Read repair scope and completion evidence.", icon: ClipboardCheck }
  ],
  SALES: [
    { href: CRM_NEXT_HOME_HREF, title: "CRM", description: "Customer relationships, work, pipeline, conversations, and insight.", icon: ContactRound, activePaths: ["/crm", "/crm-next"] },
    { href: "/my-tasks", title: "My Work", description: "Assigned follow-up and delivery actions.", icon: UserRoundCheck },
    { href: "/tasks?department=SALES", title: "Sales Tasks", description: "Task-level lead, negotiation, and delivery work.", icon: BadgeDollarSign, activeQuery: { department: "SALES" } },
    { href: "/appointments", title: "Appointments", description: "Customer appointments and commitments.", icon: CalendarDays },
    { href: CRM_NEXT_CUSTOMERS_HREF, title: "Customers", description: "Customer and lead context.", icon: ContactRound, activePaths: ["/customers"] },
    { href: "/vehicles", title: "Vehicles", description: "Permitted inventory and delivery context.", icon: CarFront }
  ],
  MARKETING: [
    { href: "/my-tasks", title: "My Work", description: "Assigned marketing and advertising actions.", icon: UserRoundCheck },
    { href: "/tasks?department=MARKETING", title: "Marketing", description: "Campaign, content, and audience work.", icon: Megaphone, activeQuery: { department: "MARKETING" } },
    { href: "/tasks?department=ADVERTISING", title: "Advertising", description: "Vehicle listings and paid promotion.", icon: Megaphone, activeQuery: { department: "ADVERTISING" } },
    { href: "/vehicles", title: "Vehicles", description: "Permitted merchandising and listing context.", icon: CarFront }
  ],
  OPERATIONS_COORDINATOR: [
    { href: "/operations-coordinator", title: "Coordinator Home", description: "Front-door loop for arrivals, paperwork, routed work, and safe peeks.", icon: House, matchExact: true },
    { href: "/vehicles/advisor", title: "Service Advisor", description: "Coordinate arrivals, customer updates, repair orders, and service handoffs.", icon: ClipboardCheck },
    { href: "/appointments", title: "Appointment Console", description: "Today flow, calendar booking, capacity, follow-up, and appointment exceptions.", icon: CalendarDays, matchExact: true },
    { href: "/vehicles/repair-orders?intakeSource=WALK_IN", title: "Check In Vehicle", description: "Start governed service intake without duplicating customer or vehicle records.", icon: ClipboardCheck },
    { href: "/vehicles/claims-desk", title: "Claims Desk", description: "Assist staff through insurance claim intake, duplicate checks, and workspace routing.", icon: ClipboardList, activePaths: ["/vehicles/claims-desk", "/vehicles/claims-workspace"] },
    { href: "/vehicles/parts-receiving", title: "Receive Parts", description: "Record arrivals, exceptions, and accountable part placement.", icon: PackageCheck },
    { href: CRM_NEXT_CUSTOMERS_HREF, title: "Customers", description: "Find or prepare customer records in Customer Console.", icon: ContactRound, activePaths: ["/customers"] },
    { href: "/operations-coordinator#paperwork-command-center", title: "Paperwork Center", description: "Prepare sales, finance, insurance, rental, payment, and document packets.", icon: SquareCheckBig },
    { href: "/documents", title: "Document Library", description: "Source-of-truth packets, requirements, review, and document archive.", icon: FileText, activePaths: ["/documents"] },
    { href: "/tasks?department=SALES", title: "Sales Paperwork", description: "Support sales, finance, insurance, rental, and delivery paperwork.", icon: BadgeDollarSign },
    { href: "/my-tasks", title: "My Work", description: "Assigned coordination tasks and follow-up.", icon: UserRoundCheck }
  ],
  OFFICE: [
    { href: "/my-tasks", title: "My Work", description: "Assigned office and documentation actions.", icon: UserRoundCheck },
    { href: "/documents", title: "Document Library", description: "Source-of-truth packets, requirements, review, and document archive.", icon: FileText, activePaths: ["/documents"] },
    { href: "/appointments", title: "Appointments", description: "Permitted appointment support.", icon: CalendarDays },
    { href: CRM_NEXT_CUSTOMERS_HREF, title: "Customers", description: "Customer and documentation context.", icon: ContactRound, activePaths: ["/customers"] },
    { href: "/tasks", title: "Team Tasks", description: "Authorized operational task search.", icon: SquareCheckBig }
  ],
  COLLECTIONS: [
    { href: "/my-tasks?workspace=collections", title: "My Collections", description: "Assigned payment follow-up and account actions.", icon: UserRoundCheck },
    { href: "/tasks?department=COLLECTIONS", title: "Collections Queue", description: "Authorized collections work.", icon: BadgeDollarSign },
    { href: CRM_NEXT_CUSTOMERS_HREF, title: "Account Context", description: "Minimum permitted Customer Console customer and account context.", icon: ContactRound, activePaths: ["/customers"] }
  ],
  GENERAL_STAFF: [
    { href: "/my-tasks", title: "My Work", description: "Assigned work and next actions.", icon: UserRoundCheck },
    { href: "/tasks", title: "Tasks", description: "Authorized task search and organization.", icon: SquareCheckBig }
  ]
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Management",
    items: [
      {
        href: "/manager-workspace",
        title: "Manager Workspace",
        description: "Executive direction, operating intervention, and personal execution.",
        icon: House,
        matchExact: true,
        isVisible: (user) => isManager(user)
      },
      {
        href: "/command-center",
        title: "Command Center",
        description: "Company-wide operating command and cross-team visibility.",
        icon: Landmark,
        matchExact: true,
        isVisible: (user) => isManager(user)
      }
    ]
  },
  {
    label: "Operations",
    items: [
      dispatchBoardNavigationItem,
      {
        href: "/website-console",
        title: "Website Console",
        description: "Public website readiness, inventory, content, and customer handoffs.",
        icon: Globe,
        badge: "Foundation",
        isVisible: canOpenWebsiteConsole
      },
      {
        href: "/compliance",
        title: "Compliance",
        description: "Prepare upfront lease tax, review monthly worksheets, and record filing evidence.",
        icon: ShieldCheck,
        badge: "Review",
        isVisible: (user) => isManager(user)
      },
      {
        href: "/time-attendance",
        title: "Time & Attendance",
        description: "Time cards, corrections, review, and payroll handoff.",
        icon: Clock3,
        badge: "MVP"
      },
      {
        href: "/documents",
        title: "Document Library",
        description: "Source-of-truth packets, requirements, review, and archive.",
        icon: FileText
      },
      {
        href: "/reports",
        title: "Reports",
        description: "Daily, weekly, monthly reports, reviews, and saved reporting history.",
        icon: BarChart3,
        badge: "Live"
      }
    ]
  },
  {
    label: "Planned",
    items: [
      {
        href: "/people-hr",
        title: "People & HR",
        description: "Employee operations and controlled HR records.",
        icon: Users,
        badge: "Planned",
        disabled: true
      },
      {
        href: "/legal-accounting",
        title: "Legal & Accounting",
        description: "Obligations, requests, documents, and follow-up.",
        icon: Landmark,
        badge: "Planned",
        disabled: true
      },
      {
        href: "/library-training",
        title: "Library & Training",
        description: "Controlled forms, procedures, and training.",
        icon: BookOpen,
        badge: "Planned",
        disabled: true
      },
      {
        href: "/insights",
        title: "Insights",
        description: "Governed scorecards and operating intelligence.",
        icon: BarChart3,
        badge: "Planned",
        disabled: true
      }
    ]
  },
  {
    label: "Control",
    items: [
      {
        href: "/administration",
        title: "Administration",
        description: "Staff accounts, roles, duties, templates, and access control.",
        icon: BriefcaseBusiness,
        isVisible: (user) => canManageSettings(user)
      },
      {
        href: "/settings",
        title: "Settings",
        description: "Dispatch generation and board settings.",
        icon: Settings,
        isVisible: (user) => canManageSettings(user)
      }
    ]
  }
];

export function getNavigationGroups(user: AuthenticatedUser) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.isVisible ? item.isVisible(user) : true))
    }))
    .filter((group) => group.items.length > 0);
}

export function getDispatchNavigationItems(
  user: AuthenticatedUser,
  workspace: WorkspaceKey = getWorkspaceKey(user)
) {
  const roleItems = workspaceNavigationItems[workspace];
  if (roleItems) {
    const visibleRoleItems = roleItems.filter((item) => (item.isVisible ? item.isVisible(user) : true));
    if (workspace === "TECHNICIAN" || visibleRoleItems.some((item) => item.href === dispatchBoardNavigationItem.href)) {
      return visibleRoleItems;
    }
    return [dispatchBoardNavigationItem, ...visibleRoleItems].filter((item) => (item.isVisible ? item.isVisible(user) : true));
  }
  return dispatchNavigationItems.filter((item) => (item.isVisible ? item.isVisible(user) : true));
}

export function getNavigationItemsForPath(
  user: AuthenticatedUser,
  pathname: string,
  preferredWorkspace?: WorkspaceKey | null
) {
  return getDispatchNavigationItems(
    user,
    resolveWorkspaceForPath(user, pathname, preferredWorkspace)
  );
}

export function isDispatchConsolePath(pathname: string) {
  if (pathname === "/crm" || pathname.startsWith("/crm/")) return false;
  if (pathname === "/crm-next" || pathname.startsWith("/crm-next/")) return false;
  if (pathname === "/growth" || pathname.startsWith("/growth/")) return false;
  if (pathname === "/customers" || pathname.startsWith("/customers/")) return true;
  return dispatchNavigationItems.some((item) => {
    const baseHref = item.href.split(/[?#]/, 1)[0];
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  });
}
