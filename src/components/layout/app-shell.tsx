import type { ReactNode } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";

import { SiteHeader } from "./site-header";

type AppShellProps = {
  children: ReactNode;
  user: AuthenticatedUser;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <main className="page-shell">
      <div className="shell-frame">
        <SiteHeader user={user} />
        <div className="shell-banner">
          <p>
            Signed in as <strong>{user.name}</strong> with {user.roles.join(", ")} access. The
            board and task routes remain intentionally scoped placeholders while the settings route
            now supports manager-only generation configuration.
          </p>
        </div>
        <div className="shell-content">{children}</div>
      </div>
    </main>
  );
}

