"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { WorkspaceKey } from "@/server/auth/navigation";
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

type AppShellProps = {
  children: ReactNode;
  preferredWorkspace?: WorkspaceKey | null;
  user: AuthenticatedUser;
};

function AppShellContent({ children, preferredWorkspace, user }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mode } = useWorkspaceMode();
  const commandCenterHome = pathname === "/command-center";
  const salesConsole = isSalesConsolePath(pathname);
  const operationsCoordinatorConsole = isOperationsCoordinatorConsolePath(pathname);
  const dispatchConsole = isDispatchConsolePath(pathname) && !isInventoryConsolePath(pathname) && !isAppointmentConsolePath(pathname) && !isSalesConsolePath(pathname);
  const consoleNavigation = salesConsole ? null : getConsoleNavigation(pathname, user, preferredWorkspace);
  const hasSidebar = commandCenterHome || Boolean(consoleNavigation);
  const tasksWorkspace = pathname.startsWith("/tasks");
  const sidebarCompact = commandCenterHome && tasksWorkspace && mode !== "standard";
  const salesConsoleReturnTo = searchParams.get("returnTo");
  const showSalesConsoleReturn =
    Boolean(salesConsoleReturnTo?.startsWith("/sales")) &&
    !salesConsoleReturnTo?.startsWith("//") &&
    !salesConsole;
  const showInventoryRouteTabs = isInventoryConsolePath(pathname);
  const showFullInventoryNavigation = consoleNavigation?.title === "Inventory Console";

  return (
    <div
      className={[
        "app-frame",
        !commandCenterHome ? "app-frame-console" : "",
        consoleNavigation ? "app-frame-console-sidebar" : "",
        salesConsole ? "app-frame-sales-standalone" : "",
        operationsCoordinatorConsole ? "app-frame-operations-coordinator" : "",
        sidebarCompact ? "app-frame-sidebar-compact" : "",
        tasksWorkspace ? `app-frame-workspace-${mode}` : ""
      ].filter(Boolean).join(" ")}
    >
      <SessionHealthGuard />
      {commandCenterHome ? <AppSidebar compact={sidebarCompact} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} /> : null}
      {consoleNavigation ? <ConsoleSidebar console={consoleNavigation} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} /> : null}
      {hasSidebar && navigationOpen ? (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />
      ) : null}
      <div className="app-workspace">
        {salesConsole ? null : (
          <AppTopbar commandCenterHome={commandCenterHome} onMenuOpen={() => setNavigationOpen(true)} preferredWorkspace={preferredWorkspace} showNavigationMenu={hasSidebar} user={user} />
        )}
        {dispatchConsole ? <DispatchConsoleHeader preferredWorkspace={preferredWorkspace} user={user} /> : null}
        {showSalesConsoleReturn ? (
          <nav className="app-return-banner" aria-label="Return navigation">
            <a href={salesConsoleReturnTo ?? "/sales"}>← Return to Sales Console</a>
            <span>Opened from Sales Console</span>
          </nav>
        ) : null}
        {showInventoryRouteTabs ? <InventoryConsoleRouteTabs allowedHrefs={consoleNavigation?.items.map(item => item.href) ?? []} pathname={pathname} searchParams={new URLSearchParams(searchParams.toString())} showFullNavigation={showFullInventoryNavigation} showReturn={!showSalesConsoleReturn} /> : null}
        <main className="app-content">{children}</main>
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
