import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getOwnSessionSecurity, logoutOtherSessions } from "@/server/auth/service";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";
import { createPrismaAuthStore } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

const authStore = createPrismaAuthStore(prisma);

async function getSessionContext() {
  const [cookieStore, user] = await Promise.all([cookies(), getCurrentUser()]);
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return {
    sessionToken,
    user
  };
}

export async function GET() {
  const { sessionToken, user } = await getSessionContext();

  if (!user || !sessionToken) {
    return NextResponse.json(
      {
        error: "Authentication required."
      },
      { status: 401 }
    );
  }

  const security = await getOwnSessionSecurity(authStore, user, sessionToken);

  return NextResponse.json(security);
}

export async function DELETE() {
  const { sessionToken, user } = await getSessionContext();

  if (!user || !sessionToken) {
    return NextResponse.json(
      {
        error: "Authentication required."
      },
      { status: 401 }
    );
  }

  const result = await logoutOtherSessions(authStore, user, sessionToken);
  const security = await getOwnSessionSecurity(authStore, user, sessionToken);

  return NextResponse.json({
    ...result,
    ...security
  });
}
