import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Clock3,
  ClipboardCheck,
  FileText,
  ContactRound,
  FolderKanban,
  Gauge,
  House,
  Landmark,
  ListChecks,
  Megaphone,
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
import {
  getWorkspaceKey,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import { canManageSettings, isManager } from "@/server/policies/access";

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
    href: "/customers",
    title: "Customers",
    description: "Customer records and connected work.",
    icon: ContactRound,
    parentHref: "/board"
  },
  {
    href: "/tasks?department=SALES",
    title: "Sales",
    description: "Sales leads, follow-up, appointments, negotiations, and delivery work.",
    icon: BadgeDollarSign,
    parentHref: "/board",
    activeQuery: { department: "SALES" }
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
  }
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
    { href: "/my-tasks?workspace=vehicle-operations-lead", title: "My Vehicle Work", description: "Assigned vehicle operations work and next actions.", icon: UserRoundCheck },
    { href: "/vehicles/inventory", title: "Inventory Flow", description: "Move units through acquisition, recon, merchandising, and readiness.", icon: RefreshCw },
    { href: "/vehicles/shop-recon", title: "Shop & Recon", description: "Production, bottlenecks, repair status, and QC readiness.", icon: Wrench },
    { href: "/vehicles/parts-operations", title: "Parts Runner", description: "Parts demand, pickup, receiving, returns, and constrained work.", icon: BriefcaseBusiness },
    { href: "/vehicles/workflows/add-vehicle", title: "Receive Vehicle", description: "Start vehicle intake, custody, keys, photos, and lot placement.", icon: CarFront },
    { href: "/manager-review?scope=inventory", title: "Exceptions", description: "Inventory and shop exceptions requiring lead review.", icon: ShieldCheck }
  ],
  SERVICE: [
    { href: "/vehicles/shop-recon", title: "Shop & Recon", description: "Production, capacity, constraints, and completion risk.", icon: Wrench },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Open and coordinate governed repair orders.", icon: ClipboardCheck },
    { href: "/vehicles/shop-dispatch", title: "Shop Dispatch", description: "Assign authorized repair work and manage bays.", icon: ListChecks },
    { href: "/vehicles/parts-operations", title: "Parts Operations", description: "Review parts readiness and constrained work.", icon: BriefcaseBusiness },
    { href: "/vehicles/quality-control", title: "Quality Control", description: "Review completion, rework, and release readiness.", icon: ShieldCheck },
    { href: "/manager-review?scope=inventory", title: "Reviews", description: "Open service exceptions and governed decisions.", icon: SquareCheckBig }
  ],
  INVENTORY: [
    { href: "/vehicles", title: "Inventory Home", description: "Inventory operating picture and priority work.", icon: House, matchExact: true },
    { href: "/vehicles/inventory", title: "Inventory Lifecycle", description: "Acquisition through sale, transfer, or disposition.", icon: RefreshCw },
    { href: "/vehicles/shop-recon", title: "Shop & Recon", description: "Inventory recon status and readiness constraints.", icon: Wrench },
    { href: "/vehicles/parts-operations", title: "Parts Readiness", description: "Parts demand affecting inventory completion.", icon: BriefcaseBusiness },
    { href: "/manager-review?scope=inventory", title: "Reviews", description: "Inventory work awaiting review or approval.", icon: ShieldCheck }
  ],
  ADVISOR: [
    { href: "/appointments", title: "Advisor Home", description: "Arrivals, check-ins, repair-order handoffs, and customer follow-up.", icon: House, matchExact: true },
    { href: "/vehicles/repair-orders?intakeSource=WALK_IN", title: "Check In Vehicle", description: "Receive a vehicle and create governed shop work.", icon: ClipboardCheck },
    { href: "/appointments?view=board", title: "Appointment Board", description: "Review schedule commitments and appointment context.", icon: CalendarDays },
    { href: "/customers", title: "Customers", description: "Customer records and connected service work.", icon: ContactRound },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Open estimates, authorizations, and customer handoffs.", icon: Wrench },
    { href: "/diagnostics/advisor-review", title: "Diagnostic Review", description: "Review findings and estimate handoffs.", icon: FileText },
    { href: "/my-tasks", title: "My Work", description: "Advisor follow-up and assigned actions.", icon: UserRoundCheck }
  ],
  TECHNICIAN: technicianNavigationItems,
  PARTS: [
    { href: "/vehicles/parts-operations", title: "Parts Operations", description: "Demand, readiness, receiving, issue, and return.", icon: BriefcaseBusiness },
    { href: "/vehicles/parts-counter", title: "Parts Counter", description: "Find and process authorized part activity.", icon: ListChecks },
    { href: "/vehicles/shop-recon", title: "Waiting Work", description: "Read-only shop work constrained by parts.", icon: Wrench },
    { href: "/my-tasks", title: "My Work", description: "Assigned parts actions and follow-up.", icon: UserRoundCheck }
  ],
  QUALITY: [
    { href: "/vehicles/quality-control", title: "QC Queue", description: "Assigned inspections and release decisions.", icon: ShieldCheck },
    { href: "/my-tasks", title: "My Work", description: "Assigned quality and rework actions.", icon: UserRoundCheck },
    { href: "/vehicles/repair-workbench", title: "Repair Orders", description: "Read repair scope and completion evidence.", icon: ClipboardCheck }
  ],
  SALES: [
    { href: "/my-tasks", title: "My Work", description: "Assigned follow-up and delivery actions.", icon: UserRoundCheck },
    { href: "/tasks?department=SALES", title: "Sales Tasks", description: "Lead, negotiation, and delivery work.", icon: BadgeDollarSign, activeQuery: { department: "SALES" } },
    { href: "/appointments", title: "Appointments", description: "Customer appointments and commitments.", icon: CalendarDays },
    { href: "/customers", title: "Customers", description: "Permitted customer and lead context.", icon: ContactRound },
    { href: "/vehicles", title: "Vehicles", description: "Permitted inventory and delivery context.", icon: CarFront }
  ],
  MARKETING: [
    { href: "/my-tasks", title: "My Work", description: "Assigned marketing and advertising actions.", icon: UserRoundCheck },
    { href: "/tasks?department=MARKETING", title: "Marketing", description: "Campaign, content, and audience work.", icon: Megaphone, activeQuery: { department: "MARKETING" } },
    { href: "/tasks?department=ADVERTISING", title: "Advertising", description: "Vehicle listings and paid promotion.", icon: Megaphone, activeQuery: { department: "ADVERTISING" } },
    { href: "/vehicles", title: "Vehicles", description: "Permitted merchandising and listing context.", icon: CarFront }
  ],
  OFFICE: [
    { href: "/my-tasks", title: "My Work", description: "Assigned office and documentation actions.", icon: UserRoundCheck },
    { href: "/appointments", title: "Appointments", description: "Permitted appointment support.", icon: CalendarDays },
    { href: "/customers", title: "Customers", description: "Permitted customer and documentation context.", icon: ContactRound },
    { href: "/tasks", title: "Team Tasks", description: "Authorized operational task search.", icon: SquareCheckBig }
  ],
  COLLECTIONS: [
    { href: "/my-tasks?workspace=collections", title: "My Collections", description: "Assigned payment follow-up and account actions.", icon: UserRoundCheck },
    { href: "/tasks?department=COLLECTIONS", title: "Collections Queue", description: "Authorized collections work.", icon: BadgeDollarSign },
    { href: "/customers?view=collections", title: "Account Context", description: "Minimum permitted customer and account context.", icon: ContactRound }
  ],
  GENERAL_STAFF: [
    { href: "/my-tasks", title: "My Work", description: "Assigned work and next actions.", icon: UserRoundCheck },
    { href: "/tasks", title: "Tasks", description: "Authorized task search and organization.", icon: SquareCheckBig }
  ]
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Operations",
    items: [
      {
        href: "/board",
        title: "Dispatch Board",
        description: "Today’s operating command, exceptions, and board readiness.",
        icon: Gauge,
        badge: "Live",
        matchExact: true
      },
      {
        href: "/time-attendance",
        title: "Time & Attendance",
        description: "Time cards, corrections, review, and payroll handoff.",
        icon: Clock3,
        badge: "MVP"
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
        href: "/compliance",
        title: "Compliance",
        description: "Licenses, permits, renewals, and evidence.",
        icon: ShieldCheck,
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
  if (roleItems) return roleItems.filter((item) => (item.isVisible ? item.isVisible(user) : true));
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
  return dispatchNavigationItems.some((item) => {
    const baseHref = item.href.split(/[?#]/, 1)[0];
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  });
}
