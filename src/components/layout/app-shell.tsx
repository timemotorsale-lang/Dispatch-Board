import type { ReactNode } from "react";

import { SiteHeader } from "./site-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="page-shell">
      <div className="shell-frame">
        <SiteHeader />
        <div className="shell-banner">
          <p>
            This protected app shell is a placeholder until authentication and permission checks
            are added in v0.2.0.
          </p>
        </div>
        <div className="shell-content">{children}</div>
      </div>
    </main>
  );
}

