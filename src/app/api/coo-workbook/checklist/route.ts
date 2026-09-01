import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCooWorkbookChecklistItem, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("required") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await createCooWorkbookChecklistItem(await getCurrentUser(), boardDate, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save checklist item.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
