import { BadgeDollarSign, BarChart3, BriefcaseBusiness, Building2, CalendarDays, CarFront, ClipboardList, ContactRound, Gauge, HandCoins, House, Megaphone, MessageSquareText, Plug, RefreshCw, Settings, ShieldCheck, Target, UserRoundCheck, UsersRound, Wrench } from "lucide-react";

import { CRM_NEXT_CUSTOMERS_HREF } from "@/features/crm/crm-route-authority";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  getPermittedWorkspaces,
  getWorkspaceDefinition,
  getWorkspaceWorkbookLabel,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import { canManageSettings } from "@/server/policies/access";

import { appointmentConsoleNavigationItems, getDispatchNavigationItems, isDispatchConsolePath, type NavigationItem } from "./navigation";

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
    activePaths: ["/vehicles/inventory", "/vehicles/control-tower", "/vehicles/workflow-operations", "/vehicles/acquisition-appraisal", "/vehicles/inventory-to-frontline", "/vehicles/retail-completion", "/vehicles/disposition-wholesale", "/vehicles/discovery", "/vehicles/registry"],
    href: "/vehicles/inventory",
    title: "Inventory Lifecycle",
    description: "Acquisition through sale, transfer, or disposition.",
    icon: RefreshCw
  },
  {
    href: "/vehicles/coo-workbook",
    title: "Inventory Workbook",
    description: "Daily operating checklist, review-before-approval context, and report draft workspace.",
    icon: ClipboardList
  },
  {
    href: "/vehicles/outside-vendors",
    title: "Outside Vendors",
    description: "Vendor profiles, active offsite work, billing readiness, invoices, and QC outcomes.",
    icon: Building2
  },
  {
    activePaths: ["/vehicles/shop-recon", "/vehicles/parts-operations", "/vehicles/parts", "/vehicles/parts-counter", "/vehicles/service-close-parts", "/vehicles/shop-planning", "/vehicles/shop-dispatch", "/vehicles/shop-production", "/vehicles/shop-metrics", "/vehicles/quality-control", "/vehicles/advisor", "/vehicles/recon-repair-advisor", "/vehicles/comebacks"],
    href: "/vehicles/shop-recon",
    title: "Shop & Recon",
    description: "Daily production, capacity, constraints, and parts readiness.",
    icon: Wrench
  },
  {
    href: "/vehicles/recon-repair-advisor",
    title: "Recon/Repair Advisor",
    description: "Prototype cockpit for Rapid Recon-style vehicle execution.",
    icon: MessageSquareText
  },
  {
    activePaths: ["/vehicles/repair-workbench", "/vehicles/repair-orders"],
    href: "/vehicles/repair-workbench",
    title: "Repair Workbench",
    description: "Find a repair order and open its enterprise execution workbench.",
    icon: ClipboardList
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

const salesItems: NavigationItem[] = [
  {
    href: "/sales",
    title: "Today",
    description: "Ranked sales work, next actions, and seller priorities.",
    icon: House,
    matchExact: true
  },
  {
    href: "/vehicles/outside-vendors",
    title: "Outside Vendors",
    description: "Reusable body shop, specialty, and sublet repair partners.",
    icon: Building2
  },
  {
    href: "/sales#leads",
    title: "Leads",
    description: "Lead intake health, SLA risk, dedupe, and assignment.",
    icon: UserRoundCheck
  },
  {
    href: "/sales#pipeline",
    title: "Pipeline",
    description: "Opportunity stage, closeability, freshness, and forecast health.",
    icon: BarChart3
  },
  {
    href: "/sales#deal-desk",
    title: "Deal Desk",
    description: "Quote scenarios, approvals, finance blockers, and delivery readiness.",
    icon: HandCoins
  },
  {
    href: "/sales#inventory-intelligence",
    title: "Inventory Intelligence",
    description: "Vehicle matches, alternatives, readiness blockers, and market pressure.",
    icon: CarFront
  },
  {
    href: "/sales#command-center",
    title: "Command Center",
    description: "Manager risk queues, approvals, delivery blockers, and coaching.",
    icon: Gauge
  },
  {
    href: "/appointments",
    title: "Appointments",
    description: "Customer appointments and confirmation work.",
    icon: CalendarDays
  },
  {
    href: CRM_NEXT_CUSTOMERS_HREF,
    title: "Customers",
    description: "Customer 360 and permitted relationship context.",
    icon: ContactRound,
    activePaths: ["/customers"]
  },
  {
    href: "/tasks?department=SALES",
    title: "Sales Tasks",
    description: "Task-level lead, negotiation, and delivery actions.",
    icon: BadgeDollarSign
  }
];

const growthItems: NavigationItem[] = [
  {
    href: "/growth",
    title: "Growth Home",
    description: "Daily opportunities, next actions, and launch readiness.",
    icon: House,
    matchExact: true
  },
  {
    href: "/growth#marketing-workspace",
    title: "Marketing",
    description: "Owned-channel messages, CRM follow-up, and customer lifecycle plays.",
    icon: MessageSquareText
  },
  {
    href: "/growth#advertising-workspace",
    title: "Advertising",
    description: "Paid promotion, audience signals, creative review, and budget approval.",
    icon: Megaphone
  },
  {
    href: "/growth#audiences",
    title: "Audiences",
    description: "Included, excluded, suppressed, and cleanup records before launch.",
    icon: UsersRound
  },
  {
    href: "/growth#message-studio",
    title: "Message Studio",
    description: "Customer-facing message, ad copy, offer, and disclosure review.",
    icon: Target
  },
  {
    href: "/growth#automations",
    title: "Automations",
    description: "Governed playbooks that wait for approval before activation.",
    icon: Settings
  },
  {
    href: "/growth#results",
    title: "Results",
    description: "Outcomes, attribution, CRM writeback, and follow-up work.",
    icon: BarChart3
  }
];

export const unifiedCrmItems: NavigationItem[] = [
  {
    href: "/crm",
    title: "Home",
    description: "Priorities, changes, and the next customer actions that need attention.",
    icon: House,
    matchExact: true,
    activeQuery: { view: null }
  },
  {
    href: "/crm?view=work",
    title: "Work",
    description: "Owned, due, overdue, and assigned relationship work.",
    icon: BriefcaseBusiness,
    activeQuery: { view: "work" }
  },
  {
    href: "/crm?view=customers",
    title: "Customers",
    description: "Permitted customer identity and relationship context.",
    icon: ContactRound,
    activeQuery: { view: "customers" }
  },
  {
    href: "/crm?view=pipeline",
    title: "Pipeline",
    description: "Evidence-backed opportunity stages, ownership, and next actions.",
    icon: BarChart3,
    activeQuery: { view: "pipeline" }
  },
  {
    href: "/crm?view=conversations",
    title: "Conversations",
    description: "Permitted interaction history and customer follow-up context.",
    icon: MessageSquareText,
    activeQuery: { view: "conversations" }
  },
  {
    href: "/crm?view=insights",
    title: "Insights",
    description: "Reconciled CRM measures with source-record drill-through.",
    icon: Gauge,
    activeQuery: { view: "insights" }
  },
  {
    href: "/crm?view=more",
    title: "More",
    description: "Additional permitted CRM tools and configuration entry points.",
    icon: Settings,
    activeQuery: { view: "more" }
  }
];

export function isInventoryConsolePath(pathname: string) {
  return pathname === "/inventory-manager" || pathname === "/vehicles" || pathname.startsWith("/vehicles/");
}

export function isOperationsCoordinatorConsolePath(pathname: string) {
  return pathname === "/operations-coordinator" || pathname.startsWith("/operations-coordinator/");
}

export function isAppointmentConsolePath(pathname: string) {
  return pathname === "/appointments" || pathname.startsWith("/appointments/");
}

export function isSalesConsolePath(pathname: string) {
  return pathname === "/sales" || pathname.startsWith("/sales/");
}

export function isGrowthConsolePath(pathname: string) {
  return pathname === "/growth" || pathname.startsWith("/growth/");
}

export function isUnifiedCrmConsolePath(pathname: string) {
  return pathname === "/crm" || pathname.startsWith("/crm/");
}

export function getConsoleNavigation(
  pathname: string,
  user: AuthenticatedUser,
  preferredWorkspace?: WorkspaceKey | null,
  contextWorkspace?: WorkspaceKey | null
): ConsoleNavigationDefinition | null {
  if (contextWorkspace) {
    const definition = getWorkspaceDefinition(contextWorkspace);
    return {
      badge: "Ready",
      homeHref: definition.landingRoute,
      items: getDispatchNavigationItems(user, contextWorkspace),
      subtitle: definition.label,
      title: "Time Motor Sales"
    };
  }

  const resolvedWorkspace = resolveWorkspaceForPath(user, pathname, preferredWorkspace);

  if (isUnifiedCrmConsolePath(pathname)) {
    const canDiscoverUnifiedCrm = getPermittedWorkspaces(user).some(
      (workspace) => workspace.key === "MANAGEMENT" || workspace.key === "SALES"
    );
    if (!canDiscoverUnifiedCrm) return null;

    return {
      badge: "Controlled",
      homeHref: "/crm",
      items: unifiedCrmItems,
      subtitle: "Customer Operations",
      title: "Customer Console"
    };
  }

  if (pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/")) {
    const label = getWorkspaceWorkbookLabel(resolvedWorkspace);
    return {
      badge: "Review",
      homeHref: "/vehicles/coo-workbook",
      items: getDispatchNavigationItems(user, resolvedWorkspace),
      subtitle: label,
      title: "Time Motor Sales"
    };
  }

  if (pathname === "/vehicles/advisor" || (isAppointmentConsolePath(pathname) && resolvedWorkspace === "ADVISOR")) {
    const definition = getWorkspaceDefinition("ADVISOR");
    return {
      badge: "Ready",
      homeHref: definition.landingRoute,
      items: getDispatchNavigationItems(user, "ADVISOR"),
      subtitle: definition.label,
      title: "Time Motor Sales"
    };
  }

  if (isAppointmentConsolePath(pathname)) {
    return {
      badge: "Ready",
      homeHref: "/appointments",
      items: appointmentConsoleNavigationItems,
      subtitle: "Scheduling & Capacity",
      title: "Appointment Console"
    };
  }

  if (isSalesConsolePath(pathname)) {
    return {
      badge: "Prototype",
      homeHref: "/sales",
      items: salesItems,
      subtitle: "Enterprise Sales",
      title: "Sales Console"
    };
  }

  if (isGrowthConsolePath(pathname)) {
    return {
      badge: "Review",
      homeHref: "/growth",
      items: growthItems,
      subtitle: "Marketing & Advertising",
      title: "Growth Console"
    };
  }

  if (isOperationsCoordinatorConsolePath(pathname)) {
    const canUseCoordinator = getPermittedWorkspaces(user).some((workspace) => workspace.key === "OPERATIONS_COORDINATOR");
    if (canUseCoordinator) {
      const definition = getWorkspaceDefinition("OPERATIONS_COORDINATOR");
      return {
        badge: "Ready",
        homeHref: definition.landingRoute,
        items: getDispatchNavigationItems(user, "OPERATIONS_COORDINATOR"),
        subtitle: definition.label,
        title: "Time Motor Sales"
      };
    }
  }

  const workspace = resolvedWorkspace;
  const definition = getWorkspaceDefinition(workspace);
  const workspacePath =
    isInventoryConsolePath(pathname) ||
    isDispatchConsolePath(pathname) ||
    isOperationsCoordinatorConsolePath(pathname) ||
    pathname.startsWith("/diagnostics") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/appointments");

  if (workspacePath && workspace !== "MANAGEMENT") {
    return {
      badge: "Ready",
      homeHref: definition.landingRoute,
      items: getDispatchNavigationItems(user, workspace),
      subtitle: definition.label,
      title: "Time Motor Sales"
    };
  }

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
