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
  Landmark,
  ListChecks,
  Megaphone,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Stethoscope,
  UserRoundCheck,
  Users,
  type LucideIcon
} from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isTechnicianOnlyUser } from "@/server/auth/navigation";
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

export function getDispatchNavigationItems(user: AuthenticatedUser) {
  if (isTechnicianOnlyUser(user)) return technicianNavigationItems;
  return dispatchNavigationItems.filter((item) => (item.isVisible ? item.isVisible(user) : true));
}

export function isDispatchConsolePath(pathname: string) {
  return dispatchNavigationItems.some((item) => {
    const baseHref = item.href.split(/[?#]/, 1)[0];
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  });
}
