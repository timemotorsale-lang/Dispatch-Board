import {
  Activity,
  CalendarDays,
  Car,
  ClipboardCheck,
  Gauge,
  ListChecks,
  Settings,
  Users,
  UserRound,
  Wrench,
  type LucideIcon
} from "lucide-react";

export type NavigationItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
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
        href: "/vehicles",
        title: "Vehicles",
        description: "Vehicle coordination.",
        icon: Car
      },
      {
        href: "/customers",
        title: "Customers",
        description: "Customer visibility.",
        icon: UserRound
      },
      {
        href: "/appointments",
        title: "Appointments",
        description: "Upcoming appointments.",
        icon: CalendarDays
      },
      {
        href: "/manager-review",
        title: "Manager Review",
        description: "Approval and attention queue.",
        icon: ClipboardCheck
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
        icon: Settings
      }
    ]
  }
];
