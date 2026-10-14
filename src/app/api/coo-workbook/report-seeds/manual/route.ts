import { WorkdayWorkbookScope } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createWorkbookManualReportItems, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  if (message.includes("closed") || message.includes("report item") || message.includes("report section")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const scope = url.searchParams.get("scope") === "STAFF" ? WorkdayWorkbookScope.STAFF : WorkdayWorkbookScope.COO;
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await createWorkbookManualReportItems(await getCurrentUser(), boardDate, scope, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add report items.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
