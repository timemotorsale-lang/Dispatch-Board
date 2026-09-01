import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCooWorkbookDailyFocusItem, createStaffWorkbookDailyFocusItem, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("closed")) return 409;
  if (message.includes("required") || message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const scope = url.searchParams.get("scope") === "STAFF" ? "STAFF" : "COO";
  const payload = await request.json().catch(() => null);

  try {
    const user = await getCurrentUser();
    const result = scope === "STAFF"
      ? await createStaffWorkbookDailyFocusItem(user, boardDate, payload)
      : await createCooWorkbookDailyFocusItem(user, boardDate, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save Daily Focus item.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
