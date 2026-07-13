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
import { useWorkspaceMode, WorkspaceModeProvider } from "./workspace-mode";

type AppShellProps = {
  children: ReactNode;
  user: AuthenticatedUser;
};

function AppShellContent({ children, user }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pathname = usePathname();
  const { mode } = useWorkspaceMode();
  const tasksWorkspace = pathname.startsWith("/tasks");
  const sidebarCompact = tasksWorkspace && mode !== "standard";

  return (
    <div
      className={[
        "app-frame",
        sidebarCompact ? "app-frame-sidebar-compact" : "",
        tasksWorkspace ? `app-frame-workspace-${mode}` : ""
      ].filter(Boolean).join(" ")}
    >
      <SessionHealthGuard />
      <AppSidebar compact={sidebarCompact} isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} />
      {navigationOpen ? (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />
      ) : null}
      <div className="app-workspace">
        <AppTopbar onMenuOpen={() => setNavigationOpen(true)} user={user} />
        <main className="app-content">{children}</main>
        {pathname !== "/tasks/intake" && pathname !== "/prototype/task-intake" ? (
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
    <WorkspaceModeProvider>
      <AppShellContent {...props} />
    </WorkspaceModeProvider>
  );
}
