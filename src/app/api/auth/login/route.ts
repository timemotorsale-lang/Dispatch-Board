import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { loginWithPassword } from "@/server/auth/service";
import { resolvePostLoginRoute } from "@/server/auth/navigation";
import { buildSessionCookie } from "@/server/auth/session";
import { createPrismaAuthStore } from "@/server/auth/store";
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

  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);

  return NextResponse.json({
    redirectTo: resolvePostLoginRoute(result.user, payload.returnTo),
    user: result.user
  });
}
