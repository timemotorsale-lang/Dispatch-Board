import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import {
  resolveWorkspacePreference,
  WORKSPACE_COOKIE_NAME
} from "@/server/auth/workspace-preference";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const preferredWorkspace = resolveWorkspacePreference(
    user,
    cookieStore.get(WORKSPACE_COOKIE_NAME)?.value
  );

  return <AppShell preferredWorkspace={preferredWorkspace} user={user}>{children}</AppShell>;
}

