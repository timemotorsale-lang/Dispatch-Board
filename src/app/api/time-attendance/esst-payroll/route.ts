import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { getEsstPayrollCards, recordEsstPayroll } from "@/server/time-attendance/esst-payroll";

function handleError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P2034", "P2002"].includes(error.code)) {
      return NextResponse.json({ error: "The payroll record changed while saving. Refresh, then retry." }, { status: 409 });
    }
    return NextResponse.json({ error: "ESST payroll records are temporarily unavailable." }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "ESST payroll records are temporarily unavailable.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : 400 });
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    return NextResponse.json(await getEsstPayrollCards(await getCurrentUser(), {
      start: query.get("start") ?? "", end: query.get("end") ?? ""
    }));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await recordEsstPayroll(await getCurrentUser(), await request.json().catch(() => null)));
  } catch (error) {
    return handleError(error);
  }
}
