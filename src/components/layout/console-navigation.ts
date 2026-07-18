import { BarChart3, BriefcaseBusiness, House, MessageSquareText, Plug, RefreshCw, Settings, ShieldCheck, Wrench } from "lucide-react";

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

const inventoryItems: NavigationItem[] = [
  {
    href: "/vehicles",
    title: "Home",
    description: "Inventory Console operating home.",
    icon: House,
    matchExact: true
  },
  {
    activePaths: ["/vehicles/inventory", "/vehicles/control-tower", "/vehicles/acquisition-appraisal", "/vehicles/inventory-to-frontline", "/vehicles/retail-completion", "/vehicles/disposition-wholesale", "/vehicles/discovery", "/vehicles/registry"],
    href: "/vehicles/inventory",
    title: "Inventory Lifecycle",
    description: "Acquisition through sale, transfer, or disposition.",
    icon: RefreshCw
  },
  {
    activePaths: ["/vehicles/parts-operations", "/vehicles/parts", "/vehicles/parts-counter", "/vehicles/service-close-parts", "/vehicles/shop-planning", "/vehicles/shop-dispatch", "/vehicles/shop-production", "/vehicles/quality-control"],
    href: "/vehicles/shop-production",
    title: "Shop & Recon",
    description: "Daily production, capacity, constraints, and parts readiness.",
    icon: Wrench
  },
  {
    href: "/manager-review?scope=inventory&view=reviews",
    title: "Reviews",
    description: "Inventory and shop work awaiting review.",
    icon: MessageSquareText
  },
  {
    href: "/manager-review?scope=inventory&view=approvals",
    title: "Approvals",
    description: "Authority-scoped consequential decisions.",
    icon: ShieldCheck
  },
  {
    href: "/reports?scope=inventory",
    title: "Reports",
    description: "Governed inventory, shop, and parts reporting.",
    icon: BarChart3
  },
  {
    href: "/settings/vehicle-operations",
    title: "Administration",
    description: "Vehicle-operation policies, rollout, and health.",
    icon: Settings
  }
];

export function isInventoryConsolePath(pathname: string) {
  return pathname === "/inventory-manager" || pathname === "/vehicles" || pathname.startsWith("/vehicles/");
}

export function getConsoleNavigation(pathname: string, user: AuthenticatedUser): ConsoleNavigationDefinition | null {
  if (isInventoryConsolePath(pathname)) {
    return {
      badge: "Live",
      homeHref: "/vehicles",
      items: inventoryItems,
      subtitle: "Vehicle Operations",
      title: "Inventory Console"
    };
  }

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
