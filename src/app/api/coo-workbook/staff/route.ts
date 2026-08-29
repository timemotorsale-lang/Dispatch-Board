import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getStaffWorkbook, getStaffWorkbookSummaries } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  return 500;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const workbook = await getStaffWorkbook(user, boardDate);
    const staffWorkbookSummaries = isManager(user) ? await getStaffWorkbookSummaries(user, boardDate) : [];
    return NextResponse.json({ staffWorkbookSummaries, workbook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff workbook.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
