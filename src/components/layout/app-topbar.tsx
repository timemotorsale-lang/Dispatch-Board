"use client";

import { ArrowLeft, Bell, Building2, CalendarDays, Columns3, House, Menu, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  canOpenDispatchBoard,
  getPermittedWorkspaces,
  getWorkspaceDefinition,
  isTechnicianOnlyUser,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import { isManager } from "@/server/policies/access";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { CrmModeSwitch } from "@/features/crm/crm-mode-switch";
import { getAppBreadcrumb } from "./app-topbar-breadcrumbs";

import { getNavigationGroups, getNavigationItemsForPath, isDispatchConsolePath } from "./navigation";
import { isAppointmentConsolePath, isInventoryConsolePath } from "./console-navigation";
import { useAppearance } from "./appearance";
import crmHeaderStyles from "./crm-topbar.module.css";

type AppTopbarProps = {
  commandCenterHome: boolean;
  containedWorkspace?: boolean;
  onMenuOpen(): void;
  preferredWorkspace?: WorkspaceKey | null;
  showNavigationMenu: boolean;
  user: AuthenticatedUser;
};

type TopbarOperationalResult = {
  detail: string;
  href: string;
  id: string;
  label: string;
  status: string | null;
  type: string;
};

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatBusinessDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

export function AppTopbar({ commandCenterHome, containedWorkspace = false, onMenuOpen, preferredWorkspace, showNavigationMenu, user }: AppTopbarProps) {
  const { appearance, setAppearance } = useAppearance();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sourceReturnTo = safeReturnTo(searchParams.get("returnTo"));
  const dispatchView = searchParams.get("view") === "live" ? "live" : "overview";
  const crmView = searchParams.get("view") === "work"
    ? "work"
    : searchParams.get("view") === "customers"
      ? "customers"
      : searchParams.get("view") === "pipeline"
        ? "pipeline"
        : searchParams.get("view") === "conversations"
          ? "conversations"
          : searchParams.get("view") === "insights"
            ? "insights"
            : searchParams.get("view") === "more"
              ? "more"
              : "home";
  const technicianOnly = isTechnicianOnlyUser(user);
  const cooWorkbook = pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/");
  const showCrmModeSwitch = pathname === "/crm-next" || pathname.startsWith("/crm-next/")
    || pathname === "/customers" || pathname.startsWith("/customers/")
    || pathname === "/crm" || pathname.startsWith("/crm/");
  const activeWorkspace = cooWorkbook
    ? "MANAGEMENT"
    : pathname === "/vehicles/advisor"
    || pathname === "/vehicles/recon-repair-advisor"
    ? "ADVISOR"
    : resolveWorkspaceForPath(user, pathname, preferredWorkspace);
  const permittedWorkspaces = getPermittedWorkspaces(user);
  const canOpenManagementWorkspace = permittedWorkspaces.some((workspace) => workspace.key === "MANAGEMENT");
  const canOpenRoleDispatchBoard = canOpenDispatchBoard(user) && activeWorkspace !== "TECHNICIAN";
  const activeWorkspaceDefinition = getWorkspaceDefinition(activeWorkspace);
  const roleWorkspace = activeWorkspace !== "MANAGEMENT";
  const hasWorkspaceSwitcher = permittedWorkspaces.length > 1;
  const operationsCoordinatorAwayFromHome = activeWorkspace === "OPERATIONS_COORDINATOR" && pathname !== "/operations-coordinator";
  const appointmentConsoleAwayFromHome =
    !containedWorkspace && activeWorkspace !== "ADVISOR" && ((isAppointmentConsolePath(pathname) && (pathname !== "/appointments" || searchParams.toString() !== "")) ||
    pathname.startsWith("/settings/appointments") ||
    (pathname.startsWith("/manager-review") && searchParams.get("scope") === "appointments"));
  const advisorWorkspaceAwayFromHome =
    !containedWorkspace &&
    activeWorkspace === "ADVISOR" &&
    pathname !== "/vehicles/advisor" &&
    !cooWorkbook &&
    pathname !== "/vehicles/recon-repair-advisor";
  const advisorWorkspaceReturnHref = sourceReturnTo ?? "/vehicles/advisor";
  const sourceReturnPath = sourceReturnTo?.split(/[?#]/, 1)[0] ?? null;
  const workspaceHome = activeWorkspaceDefinition.landingRoute;
  const showWorkspaceHomePill = !commandCenterHome && (roleWorkspace || canOpenManagementWorkspace) && !(
    roleWorkspace &&
    hasWorkspaceSwitcher
  );
  const inventoryConsole = isInventoryConsolePath(pathname);
  const dispatchConsole = isDispatchConsolePath(pathname) && !inventoryConsole;
  const showDispatchBoardSwitch = !commandCenterHome && (!dispatchConsole || isAppointmentConsolePath(pathname)) && canOpenRoleDispatchBoard;
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const roleNavigationItems = getNavigationItemsForPath(user, pathname, preferredWorkspace);
  const navigationItems = [
    ...getNavigationGroups(user).flatMap((group) => group.items),
    ...roleNavigationItems
  ].filter((item) => !item.disabled);
  const activeNavigationItem = roleNavigationItems.find((item) => {
    const baseHref = item.href.split(/[?#]/, 1)[0];
    return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
  });
  const breadcrumb = roleWorkspace && !technicianOnly
    ? [activeWorkspaceDefinition.label, activeNavigationItem?.title ?? "Workspace"]
    : getAppBreadcrumb(pathname, dispatchView, technicianOnly, crmView);
  const firstBreadcrumb = typeof breadcrumb[0] === "string" ? { label: breadcrumb[0] } : breadcrumb[0];
  const visibleBreadcrumb = firstBreadcrumb?.label === "Command Control Center"
    ? breadcrumb.slice(1)
    : breadcrumb;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [operationalResults, setOperationalResults] = useState<TopbarOperationalResult[]>([]);
  const [operationalSearchBusy, setOperationalSearchBusy] = useState(false);
  const [operationalSearchError, setOperationalSearchError] = useState("");
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim().toLowerCase();
  const canSearchOperationalRecords = isSearchOpen && query.length >= 2;
  const visibleOperationalResults = canSearchOperationalRecords ? operationalResults : [];
  const visibleOperationalSearchBusy = canSearchOperationalRecords && operationalSearchBusy;
  const visibleOperationalSearchError = canSearchOperationalRecords ? operationalSearchError : "";
  const uniqueNavigationItems = navigationItems.filter(
    (entry, index, items) => items.findIndex((item) => item.href === entry.href) === index
  );
  const quickResults = query
    ? uniqueNavigationItems.filter((entry) => `${entry.title} ${entry.description}`.toLowerCase().includes(query))
    : uniqueNavigationItems.slice(0, 6);
  const notificationLinks = roleWorkspace ? roleNavigationItems.slice(0, 3).map((item) => ({
    href: item.href,
    label: item.title,
    detail: item.description
  })) : [
    { href: "/activity", label: "Activity", detail: "Review the latest Dispatch events." },
    ...(isManager(user)
      ? [{ href: "/manager-review", label: "Manager review", detail: "Open approvals and work waiting for review." }]
      : []),
    { href: "/board?view=live", label: "Live Board", detail: "Return to today’s operating work." }
  ];
  const explicitSourceReturnVisible = Boolean(
    sourceReturnTo &&
    sourceReturnPath &&
    pathname !== sourceReturnPath &&
    !operationsCoordinatorAwayFromHome &&
    !appointmentConsoleAwayFromHome &&
    !advisorWorkspaceAwayFromHome
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    const rawQuery = searchText.trim();
    if (!isSearchOpen || rawQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setOperationalSearchBusy(true);
      setOperationalSearchError("");
      const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const parameters = new URLSearchParams({
        limit: "6",
        q: rawQuery,
        returnTo,
        types: "VEHICLE,CUSTOMER,REPAIR_ORDER,REPAIR_JOB,WORK_ITEM,CLAIM"
      });
      fetch(`/api/vehicle-discovery/search?${parameters.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(payload?.error ?? "Operational search failed.");
          setOperationalResults(Array.isArray(payload?.results) ? payload.results : []);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setOperationalResults([]);
          setOperationalSearchError(error instanceof Error ? error.message : "Operational search failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setOperationalSearchBusy(false);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isSearchOpen, pathname, searchParams, searchText]);

  return (
    <header className={`app-topbar ccc-topbar${showCrmModeSwitch ? ` ${crmHeaderStyles.header}` : ""}`}>
      {showNavigationMenu ? (
        <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button">
          <Menu size={20} />
        </button>
      ) : null}
      <Link aria-label={roleWorkspace ? `${activeWorkspaceDefinition.label} Home` : "Time Motor Sales Command Control Center Home"} className="ccc-topbar-brand" href={roleWorkspace ? workspaceHome : "/command-center"}>
        <TimeMotorSalesLogo className="ccc-topbar-brand-horizontal" decorative priority variant="horizontal-reversed" />
        <TimeMotorSalesLogo className="ccc-topbar-brand-mark" decorative priority variant="mark" />
      </Link>
      {showWorkspaceHomePill ? (
        <Link aria-label={roleWorkspace ? activeWorkspaceDefinition.label : "Command Center Home"} className="ccc-home-link" href={roleWorkspace ? workspaceHome : "/command-center"}>
          <House size={15} /><span>{roleWorkspace ? activeWorkspaceDefinition.label : "CCC Home"}</span>
        </Link>
      ) : null}
      {!commandCenterHome && roleWorkspace && canOpenManagementWorkspace ? (
        <Link aria-label="Open Command Control Center home" className="ccc-home-link ccc-global-exit-link" href="/command-center">
          <House size={15} /><span>CCC Home</span>
        </Link>
      ) : null}
      {showDispatchBoardSwitch ? (
        <Link aria-label="Open Dispatch Board console" className="ccc-home-link ccc-dispatch-link ccc-global-exit-link" href="/board">
          <Columns3 size={15} /><span>Dispatch Board</span>
        </Link>
      ) : null}
      {explicitSourceReturnVisible ? (
        <Link aria-label="Return to source workspace" className="ccc-home-link oc-topbar-return" href={sourceReturnTo!}>
          <ArrowLeft size={15} /><span>Back to My Workspace</span>
        </Link>
      ) : null}
      {operationsCoordinatorAwayFromHome ? (
        <Link aria-label="Return to Operations Coordinator workspace" className="ccc-home-link oc-topbar-return" href={sourceReturnTo ?? "/operations-coordinator"}>
          <ArrowLeft size={15} /><span>Back to My Workspace</span>
        </Link>
      ) : null}
      {appointmentConsoleAwayFromHome ? (
        <Link aria-label="Return to Appointment Console home" className="ccc-home-link appointment-topbar-return" href="/appointments">
          <ArrowLeft size={15} /><span>Back to Appointment Home</span>
        </Link>
      ) : null}
      {advisorWorkspaceAwayFromHome ? (
        <Link aria-label="Return to Advisor workspace" className="ccc-home-link appointment-topbar-return" href={advisorWorkspaceReturnHref}>
          <ArrowLeft size={15} /><span>Back to My Workspace</span>
        </Link>
      ) : null}
      <WorkspaceSwitcher preferredWorkspace={preferredWorkspace} user={user} />
      <nav aria-label="Workspace breadcrumb" className="ccc-breadcrumb">
        {visibleBreadcrumb.map((part, index) => {
          const item = typeof part === "string" ? { label: part } : part;
          return (
          <span className={index === visibleBreadcrumb.length - 1 ? "ccc-breadcrumb-current" : ""} key={`${item.label}-${index}`}>
            {item.href && index < visibleBreadcrumb.length ? <Link href={item.href}>{item.label}</Link> : item.label}
            {index < visibleBreadcrumb.length - 1 ? <i aria-hidden="true">/</i> : null}
          </span>
        )})}
      </nav>

      {!showCrmModeSwitch ? <span className="ccc-dispatch-status"><i aria-hidden="true" />{commandCenterHome ? "CCC online" : activeWorkspace === "ADVISOR" ? "Advisor ready" : inventoryConsole ? "Inventory live" : dispatchConsole ? "Dispatch online" : "Console active"}</span> : null}

      {showCrmModeSwitch ? <CrmModeSwitch /> : null}

      <div className="topbar-actions" ref={actionsRef}>
        <div aria-label="Application appearance" className="app-appearance-switch" role="group">
          <button aria-label="Use light appearance" aria-pressed={appearance === "light"} className={appearance === "light" ? "active" : ""} onClick={() => setAppearance("light")} title="Light appearance" type="button"><Sun size={14} /><span>Light</span></button>
          <button aria-label="Use dark appearance" aria-pressed={appearance === "dark"} className={appearance === "dark" ? "active" : ""} onClick={() => setAppearance("dark")} title="Dark appearance" type="button"><Moon size={14} /><span>Dark</span></button>
        </div>
        <div className="topbar-popover-shell ccc-search-shell">
          <button
            aria-expanded={isSearchOpen}
            className="ccc-search-trigger"
            onClick={() => {
              setIsSearchOpen((current) => !current);
              setIsNotificationsOpen(false);
            }}
            type="button"
          >
            <Search size={16} /><span>Search work, stock #, customer…</span><kbd>/</kbd>
          </button>
          {isSearchOpen ? (
            <div className="topbar-popover topbar-search-popover">
              <div className="topbar-popover-header"><strong>Quick search</strong><span>Jump to a live Dispatch area or record.</span></div>
              <label className="topbar-search-field">
                <Search size={16} />
                <input aria-label="Search navigation" placeholder="Search Dispatch…" ref={searchInputRef} type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
              </label>
              <div className="topbar-popover-list">
                {quickResults.length ? quickResults.map((entry) => (
                  <Link className="topbar-popover-link" href={entry.href} key={entry.href} onClick={() => setIsSearchOpen(false)}>
                    <strong>{entry.title}</strong><span>{entry.description}</span>
                  </Link>
                )) : null}
                {visibleOperationalResults.length ? visibleOperationalResults.map((entry) => (
                  <Link className="topbar-popover-link" href={entry.href} key={`${entry.type}-${entry.id}`} onClick={() => setIsSearchOpen(false)}>
                    <strong>{entry.label}</strong><span>{entry.type.replaceAll("_", " ")} · {entry.status ?? "Open"} · {entry.detail}</span>
                  </Link>
                )) : null}
                {visibleOperationalSearchBusy ? <p className="topbar-popover-empty">Searching live records...</p> : null}
                {visibleOperationalSearchError ? <p className="topbar-popover-empty">{visibleOperationalSearchError}</p> : null}
                {!quickResults.length && !visibleOperationalResults.length && !visibleOperationalSearchBusy && !visibleOperationalSearchError ? <p className="topbar-popover-empty">No matching live areas or records found.</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <span className="ccc-store-context"><Building2 size={15} />TMS-001</span>
        <span className="ccc-business-date" suppressHydrationWarning><CalendarDays size={15} />{formatBusinessDate()}</span>

        <div className="topbar-popover-shell">
          <button
            aria-expanded={isNotificationsOpen}
            className="topbar-icon topbar-notifications"
            aria-label="Notifications"
            onClick={() => {
              setIsNotificationsOpen((current) => !current);
              setIsSearchOpen(false);
            }}
            type="button"
          >
            <Bell size={18} /><span>{notificationLinks.length}</span>
          </button>
          {isNotificationsOpen ? (
            <div className="topbar-popover topbar-notifications-popover">
              <div className="topbar-popover-header"><strong>Dispatch attention</strong><span>Open the area that needs action.</span></div>
              <div className="topbar-popover-list">
                {notificationLinks.map((entry) => (
                  <Link className="topbar-popover-link" href={entry.href} key={entry.href} onClick={() => setIsNotificationsOpen(false)}>
                    <strong>{entry.label}</strong><span>{entry.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="topbar-profile" title={`${user.name} · ${user.roles[0] ?? "Staff"}`}>
          <div className="user-avatar">{initials(user.name)}</div>
        </div>
      </div>
    </header>
  );
}
