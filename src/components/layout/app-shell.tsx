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
            board now includes a dedicated My Tasks view for staff-friendly daily updates while the
            full board stays available for wider coordination.
          </p>
        </div>
        <div className="shell-content">{children}</div>
      </div>
    </main>
  );
}

