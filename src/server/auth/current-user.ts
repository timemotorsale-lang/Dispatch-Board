import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/client";

import { getLoginRouteRedirect } from "./navigation";
import { readAuthenticatedUser } from "./service";
import { SESSION_COOKIE_NAME } from "./session";
import { createPrismaAuthStore, type AuthenticatedUser } from "./store";

const authStore = createPrismaAuthStore(prisma);

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return readAuthenticatedUser(authStore, sessionToken);
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentUser();
  const redirectTarget = getLoginRouteRedirect(user);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return user;
}
