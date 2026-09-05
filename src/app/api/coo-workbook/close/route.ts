import { WorkdayWorkbookScope } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { closeWorkbookDay, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  if (message.includes("closed") || message.includes("must be") || message.includes("Review End The Day") || message.includes("Resolve every planned item")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const scope = url.searchParams.get("scope") === "STAFF" ? WorkdayWorkbookScope.STAFF : WorkdayWorkbookScope.COO;

  try {
    const payload = await request.json().catch(() => ({}));
    return NextResponse.json(await closeWorkbookDay(await getCurrentUser(), boardDate, scope, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to close workbook day.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
