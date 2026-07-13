import {
  Activity,
  CalendarDays,
  Car,
  ClipboardCheck,
  FolderKanban,
  Gauge,
  LifeBuoy,
  LayoutTemplate,
  ListChecks,
  PackageOpen,
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
        title: "Dispatch Board",
        description: "Daily operations and team visibility.",
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
    label: "Operations",
    items: [
      {
        href: "/staff",
        title: "Team",
        description: "Staff and responsibilities.",
        icon: Users
      },
      {
        href: "/reports",
        title: "Reports / Insights",
        description: "Operating reports.",
        icon: Wrench
      },
      {
        href: "/tasks/intake",
        title: "Task Intake",
        description: "Prototype guided work-shaping and readiness preview.",
        icon: PackageOpen,
        badge: "Prototype"
      },
      {
        href: "/prototype/task-templates",
        title: "Task Templates",
        description: "Prototype-only enterprise workspace design.",
        icon: LayoutTemplate,
        badge: "Prototype"
      }
    ]
  },
  {
    label: "Admin",
    items: [
      {
        href: "/settings/team",
        title: "Admin",
        description: "Staff accounts, roles, duties, templates, and access control.",
        icon: Users,
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
