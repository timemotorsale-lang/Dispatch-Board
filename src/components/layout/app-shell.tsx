"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ClipboardPlus } from "lucide-react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { SessionHealthGuard } from "@/features/auth/session-health-guard";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { ConsoleSidebar } from "./console-sidebar";
import { getConsoleNavigation, isInventoryConsolePath } from "./console-navigation";
import { DispatchConsoleHeader } from "./dispatch-console-header";
import { isDispatchConsolePath } from "./navigation";
import { useWorkspaceMode, WorkspaceModeProvider } from "./workspace-mode";
import { AppearanceProvider } from "./appearance";

type AppShellProps = {
  children: ReactNode;
  user: AuthenticatedUser;
};

function AppShellContent({ children, user }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pathname = usePathname();
  const { mode } = useWorkspaceMode();
  const commandCenterHome = pathname === "/command-center";
  const dispatchConsole = isDispatchConsolePath(pathname) && !isInventoryConsolePath(pathname);
  const consoleNavigation = getConsoleNavigation(pathname, user);
  const hasSidebar = commandCenterHome || Boolean(consoleNavigation);
  const tasksWorkspace = pathname.startsWith("/tasks");
  const sidebarCompact = commandCenterHome && tasksWorkspace && mode !== "standard";
  const showTaskIntakeLauncher = dispatchConsole
    && pathname !== "/board"
    && !pathname.startsWith("/diagnostics")
    && pathname !== "/tasks/intake"
    && pathname !== "/prototype/task-intake";

  return (
    <div
      className={[
        "app-frame",
        !commandCenterHome ? "app-frame-console" : "",
        consoleNavigation ? "app-frame-console-sidebar" : "",
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
        <AppTopbar commandCenterHome={commandCenterHome} onMenuOpen={() => setNavigationOpen(true)} showNavigationMenu={hasSidebar} user={user} />
        {dispatchConsole ? <DispatchConsoleHeader user={user} /> : null}
        <main className="app-content">{children}</main>
        {showTaskIntakeLauncher ? (
          <Link aria-label="Open Task Intake" className="global-task-intake-launcher" href={`/tasks/intake?returnTo=${encodeURIComponent(pathname)}`} title="Create work from this console">
            <ClipboardPlus size={18} /><span>Task Intake</span>
          </Link>
        ) : null}
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
