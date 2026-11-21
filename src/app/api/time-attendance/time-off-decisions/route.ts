import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { decideTimeOffRequest } from "@/server/time-attendance";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await decideTimeOffRequest(await getCurrentUser(), await request.json().catch(() => null)));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "This request changed during review. Refresh and try again." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Time-off decision failed.";
    const status = message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : error instanceof EnterpriseCommandConflictError || message.includes("changed during") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
