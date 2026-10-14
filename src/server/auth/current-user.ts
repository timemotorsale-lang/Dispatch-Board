import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/server/db/client";

import { getLoginRouteRedirect, isOperationsCoordinatorDefaultUser, resolvePostLoginRoute } from "./navigation";
import { readAuthenticatedUser } from "./service";
import { SESSION_COOKIE_NAME } from "./session";
import { createPrismaAuthStore, type AuthenticatedUser } from "./store";
import {
  resolveWorkspacePreference,
  WORKSPACE_COOKIE_NAME
} from "./workspace-preference";

const authStore = createPrismaAuthStore(prisma);

async function loadCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return readAuthenticatedUser(authStore, sessionToken);
}

// Layouts and pages frequently request the same authenticated user during one
// server render. React cache keeps that work to one session/database lookup per
// request without persisting identity data between requests.
export const getCurrentUser = cache(loadCurrentUser);

function loginRedirectForReturnTo(returnTo?: string | null) {
  const params = new URLSearchParams();
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")) {
    params.set("returnTo", returnTo);
  }
  return params.size ? `/login?${params.toString()}` : "/login";
}

export async function requireCurrentUser(returnTo?: string | null): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(loginRedirectForReturnTo(returnTo));
  }

  return user;
}

export async function redirectAuthenticatedUser(returnTo?: string | null) {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const preferredWorkspace = user
    ? resolveWorkspacePreference(user, cookieStore.get(WORKSPACE_COOKIE_NAME)?.value)
    : null;
  const coordinatorDefault = isOperationsCoordinatorDefaultUser(user);
  const redirectTarget = user && returnTo
    ? resolvePostLoginRoute(user, coordinatorDefault ? null : returnTo, coordinatorDefault ? null : preferredWorkspace)
    : getLoginRouteRedirect(
        user,
        coordinatorDefault ? null : preferredWorkspace
      );

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return user;
}
