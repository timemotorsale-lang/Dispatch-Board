import { WorkdayWorkbookScope } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { prepareWorkbookCarryovers } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission") || message.includes("Manager access")) return 403;
  if (message.includes("must be") || message.includes("not supported") || message.includes("closed")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const scope = url.searchParams.get("scope") === "STAFF" ? WorkdayWorkbookScope.STAFF : WorkdayWorkbookScope.COO;

  try {
    return NextResponse.json(await prepareWorkbookCarryovers(await getCurrentUser(), boardDate, scope), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare carryover.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
