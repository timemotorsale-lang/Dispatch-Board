import {
  Activity,
  BarChart3,
  Boxes,
  CalendarDays,
  Car,
  ClipboardCheck,
  FolderKanban,
  Gauge,
  Images,
  LifeBuoy,
  LayoutTemplate,
  ListChecks,
  PackageOpen,
  PlugZap,
  ShieldCheck,
  Settings,
  Users,
  UserRound,
  Wrench,
  type LucideIcon
} from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageSettings, isManager } from "@/server/policies/access";

export type NavigationItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  matchExact?: boolean;
  parentHref?: string;
  isVisible?(user: AuthenticatedUser): boolean;
};

export type NavigationGroup = { label: string; items: NavigationItem[] };

export const navigationGroups: NavigationGroup[] = [
  {
    label: "",
    items: [
      {
        href: "/board",
        title: "Command Center",
        description: "Exceptions, priorities, and daily operational visibility.",
        icon: Gauge
      },
      {
        href: "/my-tasks",
        title: "My Tasks",
        description: "Your assigned work for today.",
        icon: ClipboardCheck
      },
      {
        href: "/tasks",
        title: "Tasks",
        description: "Shared task workflow.",
        icon: ListChecks
      },
      {
        href: "/projects",
        title: "Projects",
        description: "Department project boards and views.",
        icon: FolderKanban
      },
      {
        href: "/vehicles",
        title: "Vehicles",
        description: "Vehicle coordination.",
        icon: Car
      },
      {
        href: "/customers",
        title: "Customers",
        description: "Customer visibility.",
        icon: UserRound,
        matchExact: true
      },
      {
        href: "/customers/customer-360",
        title: "Customer 360",
        description: "Unified customer profile and relationship history.",
        icon: UserRound,
        parentHref: "/customers"
      },
      {
        href: "/customers/resolutions",
        title: "Customer Resolution",
        description: "Customer cases, SLA, and resolution queues.",
        icon: LifeBuoy,
        parentHref: "/customers"
      },
      {
        href: "/appointments",
        title: "Appointments",
        description: "Upcoming appointments.",
        icon: CalendarDays
      },
      {
        href: "/manager-review",
        title: "Manager Review Command Center",
        description: "Decisions, quality control, and operational intervention.",
        icon: ClipboardCheck,
        isVisible: (user) => isManager(user)
      },
      {
        href: "/activity",
        title: "Activity Feed",
        description: "Today's operating updates.",
        icon: Activity
      }
    ]
  },
  {
    label: "Workspaces",
    items: [
      {
        href: "/inventory-manager",
        title: "Inventory Manager Workspace",
        description: "A cross-functional inventory view for daily operating decisions.",
        icon: Boxes
      },
      {
        href: "/vehicles/inventory",
        title: "Inventory Operations",
        description: "Acquisition, readiness, aging, and capital exposure.",
        icon: Boxes
      },
      {
        href: "/vehicles/shop-dispatch",
        title: "Service Operations",
        description: "Shop dispatch, execution, quality, and delivery readiness.",
        icon: Wrench
      },
      {
        href: "/vehicles/parts-counter",
        title: "Parts Operations",
        description: "Parts availability, reservations, receiving, and shortages.",
        icon: PackageOpen
      },
      {
        href: "/customers",
        title: "Customer Operations",
        description: "Customer lifecycle, promises, approvals, and follow-up.",
        icon: UserRound,
        matchExact: true
      },
      {
        href: "/staff",
        title: "Team",
        description: "Staff and responsibilities.",
        icon: Users
      },
      {
        href: "/insights",
        title: "Insights",
        description: "Scorecards, bottlenecks, forecasts, and recommendations.",
        icon: BarChart3
      },
      {
        href: "/integrations",
        title: "Integrations",
        description: "System events, provider health, and reconciliation signals.",
        icon: PlugZap
      },
      {
        href: "/ui-reference",
        title: "Workspace Design Reference",
        description: "Approved role-based mockups and their live console destinations.",
        icon: Images,
        badge: "Design"
      },
      {
        href: "/tasks/intake",
        title: "Task Intake Workspace",
        description: "Guided work shaping, readiness, collaboration, and accountable handoff.",
        icon: PackageOpen,
        badge: "Workspace"
      },
      {
        href: "/prototype/task-templates",
        title: "Work Template Studio",
        description: "Manager-owned templates and controlled workflow design.",
        icon: LayoutTemplate,
        badge: "Preview"
      }
    ]
  },
  {
    label: "Admin",
    items: [
      {
        href: "/administration",
        title: "Administration",
        description: "Staff accounts, roles, duties, templates, and access control.",
        icon: ShieldCheck,
        isVisible: (user) => canManageSettings(user)
      }
    ]
  },
  {
    label: "Settings",
    items: [
      {
        href: "/settings",
        title: "Board Settings",
        description: "Generation and board settings.",
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
