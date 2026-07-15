import { BriefcaseBusiness, Plug, Settings } from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageSettings } from "@/server/policies/access";

import { getDispatchNavigationItems, isDispatchConsolePath, type NavigationItem } from "./navigation";

export type ConsoleNavigationDefinition = {
  badge?: string;
  homeHref: string;
  items: NavigationItem[];
  subtitle: string;
  title: string;
};

const administrationItems: NavigationItem[] = [
  {
    href: "/administration",
    title: "Administration",
    description: "Staff accounts, roles, duties, templates, and access control.",
    icon: BriefcaseBusiness
  },
  {
    href: "/integrations",
    title: "Integrations",
    description: "Connected systems, provider health, and reconciliation.",
    icon: Plug
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Application and operational configuration.",
    icon: Settings
  }
];

export function getConsoleNavigation(pathname: string, user: AuthenticatedUser): ConsoleNavigationDefinition | null {
  if (isDispatchConsolePath(pathname)) {
    return {
      badge: "Live",
      homeHref: "/board",
      items: getDispatchNavigationItems(user),
      subtitle: "Dispatch Board",
      title: "Time Motor Sales"
    };
  }

  if (
    canManageSettings(user) &&
    (pathname.startsWith("/administration") || pathname.startsWith("/integrations") || pathname.startsWith("/settings"))
  ) {
    return {
      homeHref: "/administration",
      items: administrationItems,
      subtitle: "Administration Console",
      title: "Time Motor Sales"
    };
  }

  return null;
}
