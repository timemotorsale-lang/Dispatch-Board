import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createStaffWorkbookChecklistItem, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("must be") || message.includes("required")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();

  try {
    return NextResponse.json(await createStaffWorkbookChecklistItem(await getCurrentUser(), boardDate, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create staff checklist item.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
