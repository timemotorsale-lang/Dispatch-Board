import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const revision = process.env.APP_RELEASE_SHA ?? "unversioned";
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", revision },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", revision },
      {
        status: 503,
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }
}
