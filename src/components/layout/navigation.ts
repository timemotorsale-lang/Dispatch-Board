import {
  Activity,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Clock3,
  ClipboardCheck,
  Gauge,
  Landmark,
  ListChecks,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageSettings } from "@/server/policies/access";

export type NavigationItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  matchExact?: boolean;
  parentHref?: string;
  isVisible?(user: AuthenticatedUser): boolean;
};

export type NavigationGroup = { label: string; items: NavigationItem[] };

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
        href: "/board",
        title: "Overview",
        description: "Daily readiness, workload, and manager attention.",
        icon: ClipboardCheck,
        parentHref: "/board",
        matchExact: true
      },
      {
        href: "/board#live-board",
        title: "Live Board",
        description: "Operate and update today’s work.",
        icon: ListChecks,
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
      }
    ]
  },
  {
    label: "Planned",
    items: [
      {
        href: "/time-attendance",
        title: "Time & Attendance",
        description: "Time cards, corrections, review, and payroll handoff.",
        icon: Clock3,
        badge: "Planned",
        disabled: true
      },
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
