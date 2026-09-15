import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_PASSWORD_CHANGE_REQUIRED_ROUTE, loginWithPassword } from "@/server/auth/service";
import { isOperationsCoordinatorDefaultUser, resolvePostLoginRoute } from "@/server/auth/navigation";
import { buildSessionCookie } from "@/server/auth/session";
import { createPrismaAuthStore } from "@/server/auth/store";
import {
  resolveWorkspacePreference,
  WORKSPACE_COOKIE_NAME
} from "@/server/auth/workspace-preference";
import { prisma } from "@/server/db/client";

const authStore = createPrismaAuthStore(prisma);

function isLoginPayload(value: unknown): value is { email: string; password: string; returnTo?: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.email === "string" && typeof candidate.password === "string";
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isLoginPayload(payload)) {
    return NextResponse.json(
      {
        error: "Email and password are required."
      },
      { status: 400 }
    );
  }

  const email = payload.email.trim();
  const password = payload.password;

  if (!email || password.length === 0) {
    return NextResponse.json(
      {
        error: "Email and password are required."
      },
      { status: 400 }
    );
  }

  const result = await loginWithPassword(authStore, {
    email,
    password
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message
      },
      { status: 401 }
    );
  }

  const sessionCookie = buildSessionCookie(result.sessionToken, result.expiresAt);
  const cookieStore = await cookies();
  const preferredWorkspace = resolveWorkspacePreference(
    result.user,
    cookieStore.get(WORKSPACE_COOKIE_NAME)?.value
  );
  const coordinatorDefault = isOperationsCoordinatorDefaultUser(result.user);

  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);

  return NextResponse.json({
    redirectTo: result.requiresPasswordChange
      ? AUTH_PASSWORD_CHANGE_REQUIRED_ROUTE
      : resolvePostLoginRoute(
          result.user,
          coordinatorDefault ? null : payload.returnTo,
          coordinatorDefault ? null : preferredWorkspace
        ),
    requiresPasswordChange: result.requiresPasswordChange,
    user: result.user
  });
}
