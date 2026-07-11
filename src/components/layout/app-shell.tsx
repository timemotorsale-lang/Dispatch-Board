"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { SessionHealthGuard } from "@/features/auth/session-health-guard";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

type AppShellProps = {
  children: ReactNode;
  user: AuthenticatedUser;
};

export function AppShell({ children, user }: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <div className="app-frame">
      <SessionHealthGuard />
      <AppSidebar isOpen={navigationOpen} onClose={() => setNavigationOpen(false)} user={user} />
      {navigationOpen ? (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />
      ) : null}
      <div className="app-workspace">
        <AppTopbar onMenuOpen={() => setNavigationOpen(true)} user={user} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
