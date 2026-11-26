"use client";

import type { FormEvent, MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canUseStaffCalendar } from "@/server/policies/access";
import { getPermittedWorkspaces, resolveWorkspaceForPath, type WorkspaceKey } from "@/server/auth/navigation";
import { SessionHealthGuard } from "@/features/auth/session-health-guard";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { MobileToolsNavigation } from "./mobile-tools-navigation";
import { rememberMobileScroll, restoreMobileScroll } from "./mobile-scroll";
import { ConsoleSidebar } from "./console-sidebar";
import { getConsoleNavigation, isAppointmentConsolePath, isInventoryConsolePath, isOperationsCoordinatorConsolePath, isSalesConsolePath } from "./console-navigation";
import { DispatchConsoleHeader } from "./dispatch-console-header";
import { isDispatchConsolePath } from "./navigation";
import { useWorkspaceMode, WorkspaceModeProvider, type WorkspaceMode } from "./workspace-mode";
import { AppearanceProvider } from "./appearance";
import { InventoryConsoleRouteTabs } from "./inventory-console-route-tabs";
import { AdvisorWorkspaceTabs } from "./advisor-workspace-tabs";
import { ManagerWorkspaceGuard } from "./manager-workspace-guard";
import { ManagerWorkspaceSidebar } from "./manager-workspace-sidebar";
import { TasksWorkspaceSidebar } from "./tasks-workspace-sidebar";
import { OperatingRhythmReminder } from "./operating-rhythm-reminder";
import { readManagerWorkspaceContext, withManagerWorkspaceContext } from "@/lib/manager-workspace-context";
import taskPageStyles from "./tasks-page-shell.module.css";
import { FocusedWorkspaceNavigationContext, useWorkspaceNavigation, WorkspaceNavigationScrim, WorkspaceNavigationToggle } from "./workspace-navigation";

type AppShellProps = {
  children: ReactNode;
  /** Server-decided: show the Collections menu entry (COLLECTIONS_MODULE on + permission). */
  collectionsNavigation?: boolean;
  preferredWorkspace?: WorkspaceKey | null;
  user: AuthenticatedUser;
};

export function isTasksSidebarCompact(pathname: string, mode: WorkspaceMode) {
  return pathname === "/tasks" && mode !== "standard";
}

function AppShellContent({ children, collectionsNavigation = false, preferredWorkspace, user }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;

  useEffect(() => restoreMobileScroll(location), [location]);
  const managerContext = getPermittedWorkspaces(user).some((workspace) => workspace.key === "MANAGEMENT")
    ? readManagerWorkspaceContext(searchParams)
    : null;
  const { mode } = useWorkspaceMode();
  const commandCenterHome = pathname === "/command-center";
  const managerWorkspaceHome = pathname === "/manager-workspace";
  const tasksConsoleHome = pathname === "/tasks" || pathname === "/my-tasks";
  const diagnosticVehicleWorkspace = pathname === "/diagnostics/labor-guide";
  const openRepairOrder = (pathname === "/vehicles/repair-workbench" && Boolean(searchParams.get("repairOrderId")))
    || (/^\/vehicles\/shop-recon\/[^/]+$/.test(pathname) && searchParams.get("view") === "lifecycle")
    || (/^\/vehicles\/[^/]+\/inventory-planning$/.test(pathname) && searchParams.get("view") === "lifecycle");
  const salesConsole = isSalesConsolePath(pathname);
  const operationsCoordinatorConsole = isOperationsCoordinatorConsolePath(pathname);
  const dispatchConsole = isDispatchConsolePath(pathname) && !isInventoryConsolePath(pathname) && !isAppointmentConsolePath(pathname) && !isSalesConsolePath(pathname);
  const operationsCoordinatorBoard = pathname === "/board" && resolveWorkspaceForPath(user, pathname, preferredWorkspace) === "OPERATIONS_COORDINATOR";
  const containedConsoleWorkspace: WorkspaceKey | null = managerContext
    ? searchParams.get("launch") === "advisor" || pathname === "/vehicles/advisor"
      ? "ADVISOR"
      : searchParams.get("workspace") === "inventory" || pathname === "/inventory-manager"
        ? "INVENTORY"
        : pathname.startsWith("/vehicles/shop-recon") || pathname.startsWith("/vehicles/shop-")
          ? "SERVICE"
          : null
    : null;
  const fullSchedule = pathname === "/appointments" && canUseStaffCalendar(user) && searchParams.get("view") !== "calendar"
    && (searchParams.get("view") === "board" || searchParams.get("workspace") === "board");
  const routeConsole = salesConsole || tasksConsoleHome ? null : getConsoleNavigation(pathname, user, preferredWorkspace, containedConsoleWorkspace);
  const consoleNavigation = diagnosticVehicleWorkspace || openRepairOrder || fullSchedule ? null : routeConsole;
  const hasSidebar = commandCenterHome || managerWorkspaceHome || tasksConsoleHome || Boolean(consoleNavigation);
  const tasksWorkspace = pathname.startsWith("/tasks");
  const focusedNavigation = !hasSidebar && !salesConsole;
  const navigation = useWorkspaceNavigation({ routeKey: location, alwaysDrawer: focusedNavigation });
  const drawerOpen = (hasSidebar || focusedNavigation) && navigation.drawerOpen;
  const sidebarControls = { id: navigation.id, desktopToggle: <WorkspaceNavigationToggle id={navigation.id}
    className="workspace-navigation-desktop" expanded={!navigation.collapsed} onClick={navigation.toggleDesktop}
    label={navigation.collapsed ? "Expand navigation" : "Collapse navigation"} /> };
  const salesConsoleReturnTo = searchParams.get("returnTo");
  const showSalesConsoleReturn =
    Boolean(salesConsoleReturnTo?.startsWith("/sales")) &&
    !salesConsoleReturnTo?.startsWith("//") &&
    !salesConsole;
  const showInventoryRouteTabs = isInventoryConsolePath(pathname) && !managerContext && !openRepairOrder;
  const showFullInventoryNavigation = consoleNavigation?.title === "Inventory Console";
  const cooWorkbook = pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/");
  const advisorWorkspace = !managerContext && !openRepairOrder && (
    !cooWorkbook && preferredWorkspace === "ADVISOR" ||
    pathname === "/vehicles/advisor" ||
    pathname === "/vehicles/recon-repair-advisor" ||
    consoleNavigation?.subtitle === "Advisor Workspace"
  );

  function preserveManagerContextOnLink(event: MouseEvent<HTMLElement>) {
    if (!managerContext || event.defaultPrevented) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname === "/manager-workspace" || destination.pathname.startsWith("/api/")) return;

    let containedHref = withManagerWorkspaceContext(`${destination.pathname}${destination.search}${destination.hash}`, managerContext.mode);
    const returnTo = destination.searchParams.get("returnTo");
    if (destination.pathname.startsWith("/tasks/") && (pathname === "/tasks" || pathname === "/my-tasks") && returnTo?.split(/[?#]/, 1)[0] === pathname) {
      const contained = new URL(containedHref, window.location.origin);
      contained.searchParams.set("returnTo", withManagerWorkspaceContext(returnTo, managerContext.mode));
      containedHref = contained.pathname + contained.search + contained.hash;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
      anchor.href = containedHref;
      return;
    }
    event.preventDefault();
    router.push(containedHref);
  }

  function preserveManagerContextOnForm(event: FormEvent<HTMLElement>) {
    if (!managerContext) return;
    const form = event.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "get") return;
    const destination = new URL(form.action, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname === "/manager-workspace") return;

    const values: Record<string, string> = {
      workspaceContext: "MANAGEMENT",
      managerMode: managerContext.mode,
      returnTo: managerContext.returnHref
    };
    Object.entries(values).forEach(([name, value]) => {
      let input = form.elements.namedItem(name) as HTMLInputElement | null;
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    });
  }

  return (
    <FocusedWorkspaceNavigationContext.Provider value={focusedNavigation ? { id: navigation.id, expanded: drawerOpen, onOpen: navigation.openDrawer } : null}>
    <div
      data-open-repair-order={openRepairOrder || undefined}
      data-workspace-nav={hasSidebar ? navigation.collapsed ? "collapsed" : "expanded" : undefined}
      data-focused-navigation={focusedNavigation || undefined}
      className={[
        "app-frame",
        tasksConsoleHome ? taskPageStyles.shell : "",
        !commandCenterHome ? "app-frame-console" : "",
        consoleNavigation || managerWorkspaceHome || tasksConsoleHome ? "app-frame-console-sidebar" : "",
        salesConsole ? "app-frame-sales-standalone" : "",
        operationsCoordinatorConsole || operationsCoordinatorBoard ? "app-frame-operations-coordinator" : "",
        tasksWorkspace ? `app-frame-workspace-${mode}` : ""
      ].filter(Boolean).join(" ")}
    >
      <SessionHealthGuard />
      {commandCenterHome ? <AppSidebar collectionsNavigation={collectionsNavigation} compact={false} isOpen={drawerOpen} onClose={navigation.closeDrawer} navigation={sidebarControls} user={user} /> : null}
      {managerWorkspaceHome ? <ManagerWorkspaceSidebar isOpen={drawerOpen} onClose={navigation.closeDrawer} navigation={sidebarControls} user={user} /> : null}
      {tasksConsoleHome ? <TasksWorkspaceSidebar compact={false} isOpen={drawerOpen} onClose={navigation.closeDrawer} navigation={sidebarControls} user={user} /> : null}
      {consoleNavigation ? <ConsoleSidebar console={consoleNavigation} isOpen={drawerOpen} managerContext={managerContext} onClose={navigation.closeDrawer} navigation={sidebarControls} preserveAdvisorLaunch={containedConsoleWorkspace === "ADVISOR"} user={user} /> : null}
      {hasSidebar && drawerOpen ? (
        <button className="sidebar-scrim" aria-label="Dismiss navigation" tabIndex={-1} onClick={navigation.closeDrawer} />
      ) : null}
      {focusedNavigation && <>
        {drawerOpen && <WorkspaceNavigationScrim onClick={navigation.closeDrawer} />}
        <div id={navigation.id} className="focused-workspace-drawer" role="dialog" aria-modal="true"
          aria-label="Workspace navigation" hidden={!drawerOpen}>
          {drawerOpen && (routeConsole
            ? <ConsoleSidebar console={routeConsole} isOpen managerContext={managerContext} onClose={navigation.closeDrawer} preserveAdvisorLaunch={containedConsoleWorkspace === "ADVISOR"} user={user} />
            : <AppSidebar collectionsNavigation={collectionsNavigation} compact={false} isOpen onClose={navigation.closeDrawer} user={user} />)}
        </div>
      </>}
      <div className="app-workspace" inert={drawerOpen}>
        {salesConsole ? <MobileToolsNavigation standalone /> : null}
        {!openRepairOrder && <OperatingRhythmReminder />}
        {salesConsole ? null : (
          <AppTopbar collectionsNavigation={collectionsNavigation} commandCenterHome={commandCenterHome} containedWorkspace={Boolean(managerContext)} onMenuOpen={navigation.openDrawer} navigationId={navigation.id} navigationExpanded={drawerOpen} preferredWorkspace={preferredWorkspace} showNavigationMenu={hasSidebar || focusedNavigation} user={user} />
        )}
        {openRepairOrder && <OperatingRhythmReminder />}
        {dispatchConsole && !tasksConsoleHome && !diagnosticVehicleWorkspace && !openRepairOrder ? <DispatchConsoleHeader preferredWorkspace={preferredWorkspace} user={user} /> : null}
        {showSalesConsoleReturn ? (
          <nav className="app-return-banner" aria-label="Return navigation">
            <a href={salesConsoleReturnTo ?? "/sales"}>← Return to Sales Console</a>
            <span>Opened from Sales Console</span>
          </nav>
        ) : null}
        {managerContext ? <ManagerWorkspaceGuard /> : null}
        {advisorWorkspace ? <AdvisorWorkspaceTabs pathname={pathname} searchParams={new URLSearchParams(searchParams.toString())} /> : null}
        {showInventoryRouteTabs && !advisorWorkspace ? <InventoryConsoleRouteTabs allowedHrefs={consoleNavigation?.items.map(item => item.href) ?? []} pathname={pathname} searchParams={new URLSearchParams(searchParams.toString())} showFullNavigation={showFullInventoryNavigation} showReturn={!showSalesConsoleReturn} /> : null}
        <main className="app-content" onClickCapture={(event) => {
          if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
            if (link && link.target !== "_blank" && !link.hasAttribute("download")) {
              if (link.origin === window.location.origin && (link.pathname.startsWith("/tasks/") || link.pathname === "/capture" || link.pathname.startsWith("/capture/"))) {
                const returnTo = new URLSearchParams(link.search).get("returnTo");
                if (returnTo?.split(/[?#]/, 1)[0] === pathname) rememberMobileScroll(returnTo);
              }
            }
          }
          preserveManagerContextOnLink(event);
        }} onSubmitCapture={preserveManagerContextOnForm}>{children}</main>
      </div>
    </div>
    </FocusedWorkspaceNavigationContext.Provider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <AppearanceProvider>
      <WorkspaceModeProvider>
        <AppShellContent {...props} />
      </WorkspaceModeProvider>
    </AppearanceProvider>
  );
}
