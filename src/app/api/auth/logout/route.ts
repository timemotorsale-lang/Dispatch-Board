import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logoutWithSessionToken } from "@/server/auth/service";
import { buildExpiredSessionCookie, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { createPrismaAuthStore } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

const authStore = createPrismaAuthStore(prisma);

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  await logoutWithSessionToken(authStore, sessionToken);

  const expiredSessionCookie = buildExpiredSessionCookie();
  cookieStore.set(
    expiredSessionCookie.name,
    expiredSessionCookie.value,
    expiredSessionCookie.options
  );

  return NextResponse.json({
    ok: true
  });
}
