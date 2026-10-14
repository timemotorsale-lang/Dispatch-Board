import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createStaffWorkbookReportDraft, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const cadence = (url.searchParams.get("cadence") ?? "DAILY").toUpperCase();

  try {
    return NextResponse.json(await createStaffWorkbookReportDraft(await getCurrentUser(), boardDate, cadence), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate staff Daily Report Draft.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
