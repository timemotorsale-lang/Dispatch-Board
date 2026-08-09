"use client";

import type { FormEvent, MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getPermittedWorkspaces, type WorkspaceKey } from "@/server/auth/navigation";
import { SessionHealthGuard } from "@/features/auth/session-health-guard";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { ConsoleSidebar } from "./console-sidebar";
import { getConsoleNavigation, isAppointmentConsolePath, isInventoryConsolePath, isOperationsCoordinatorConsolePath, isSalesConsolePath } from "./console-navigation";
import { DispatchConsoleHeader } from "./dispatch-console-header";
import { isDispatchConsolePath } from "./navigation";
import { useWorkspaceMode, WorkspaceModeProvider } from "./workspace-mode";
import { AppearanceProvider } from "./appearance";
import { InventoryConsoleRouteTabs } from "./inventory-console-route-tabs";
import { AdvisorWorkspaceTabs } from "./advisor-workspace-tabs";
import { ManagerWorkspaceGuard } from "./manager-workspace-guard";
import { readManagerWorkspaceContext, withManagerWorkspaceContext } from "@/lib/manager-workspace-context";

type AppShellProps = {
  children: ReactNode;
  preferredWorkspace?: WorkspaceKey | null;
  user: AuthenticatedUser;
};

function AppShellContent({ children, preferredWorkspace, user }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const managerContext = getPermittedWorkspaces(user).some((workspace) => workspace.key === "MANAGEMENT")
    ? readManagerWorkspaceContext(searchParams)
    : null;
  const { mode } = useWorkspaceMode();
  const commandCenterHome = pathname === "/command-center";
  const managerWorkspaceHome = pathname === "/manager-workspace";
  const salesConsole = isSalesConsolePath(pathname);
  const operationsCoordinatorConsole = isOperationsCoordinatorConsolePath(pathname);
  const dispatchConsole = isDispatchConsolePath(pathname) && !isInventoryConsolePath(pathname) && !isAppointmentConsolePath(pathname) && !isSalesConsolePath(pathname);
  const containedFocusedTool = Boolean(managerContext);
  const consoleNavigation = salesConsole || containedFocusedTool ? null : getConsoleNavigation(pathname, user, preferredWorkspace);
  const hasManagementSidebar = commandCenterHome || managerWorkspaceHome;
  const hasSidebar = hasManagementSidebar || Boolean(consoleNavigation);
  const tasksWorkspace = pathname.startsWith("/tasks");
  const sidebarCompact = commandCenterHome && tasksWorkspace && mode !== "standard";
  const salesConsoleReturnTo = searchParams.get("returnTo");
  const showSalesConsoleReturn =
    Boolean(salesConsoleReturnTo?.startsWith("/sales")) &&
    !salesConsoleReturnTo?.startsWith("//") &&
    !salesConsole;
  const showInventoryRouteTabs = isInventoryConsolePath(pathname) && !managerContext;
  const showFullInventoryNavigation = consoleNavigation?.title === "Inventory Console";
  const advisorWorkspace = preferredWorkspace === "ADVISOR" && !managerContext;

  function preserveManagerContextOnLink(event: MouseEvent<HTMLElement>) {
    if (!managerContext || event.defaultPrevented) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname === "/manager-workspace" || destination.pathname.startsWith("/api/")) return;

    const containedHref = withManagerWorkspaceContext(`${destination.pathname}${destination.search}${destination.hash}`, managerContext.mode);
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
    <div
      className={[
        "app-frame",
        !commandCenterHome ? "app-frame-console" : "",
        consoleNavigation || managerWorkspaceHome ? "app-frame-console-sidebar" : "",
        salesConsole ? "app-frame-sales-standalone" : "",
        operationsCoordinatorConsole ? "app-frame-operations-coordinator" : "",
        sidebarCompact ? "app-frame-sidebar-compact" : "",
        tasksWorkspace ? `app-frame-workspace-${mode}` : ""
      ].filter(Boolean).join(" ")}
    >
      <SessionHealthGuard />
      {hasManagementSidebar ? <AppSidebar compact={sidebarCompact} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} /> : null}
      {consoleNavigation ? <ConsoleSidebar console={consoleNavigation} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} /> : null}
      {hasSidebar && navigationOpen ? (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />
      ) : null}
      <div className="app-workspace">
        {salesConsole ? null : (
          <AppTopbar commandCenterHome={commandCenterHome} containedWorkspace={Boolean(managerContext)} onMenuOpen={() => setNavigationOpen(true)} preferredWorkspace={preferredWorkspace} showNavigationMenu={hasSidebar} user={user} />
        )}
        {dispatchConsole ? <DispatchConsoleHeader preferredWorkspace={preferredWorkspace} user={user} /> : null}
        {showSalesConsoleReturn ? (
          <nav className="app-return-banner" aria-label="Return navigation">
            <a href={salesConsoleReturnTo ?? "/sales"}>← Return to Sales Console</a>
            <span>Opened from Sales Console</span>
          </nav>
        ) : null}
        {managerContext ? <ManagerWorkspaceGuard /> : null}
        {advisorWorkspace ? <AdvisorWorkspaceTabs pathname={pathname} searchParams={new URLSearchParams(searchParams.toString())} /> : null}
        {showInventoryRouteTabs && !advisorWorkspace ? <InventoryConsoleRouteTabs allowedHrefs={consoleNavigation?.items.map(item => item.href) ?? []} pathname={pathname} searchParams={new URLSearchParams(searchParams.toString())} showFullNavigation={showFullInventoryNavigation} showReturn={!showSalesConsoleReturn} /> : null}
        <main className="app-content" onClickCapture={preserveManagerContextOnLink} onSubmitCapture={preserveManagerContextOnForm}>{children}</main>
      </div>
    </div>
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
