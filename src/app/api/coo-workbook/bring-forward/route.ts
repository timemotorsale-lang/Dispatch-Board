import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { bringForwardCooWorkbookItem, bringForwardStaffWorkbookItem, currentWorkdayBoardDate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("closed")) return 409;
  if (message.includes("Choose") || message.includes("already on today")) return 400;
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
      ? await bringForwardStaffWorkbookItem(user, boardDate, payload)
      : await bringForwardCooWorkbookItem(user, boardDate, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bring prior work forward.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
