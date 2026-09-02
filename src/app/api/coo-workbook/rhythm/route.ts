import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceWorkbookLabel, getWorkspaceKey } from "@/server/auth/navigation";
import { currentWorkdayBoardDate, getStaffWorkbook, recordWorkbookOperatingRhythmEvent } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission") || message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("not supported")) return 400;
  return 500;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const boardDate = currentWorkdayBoardDate();
    const workbook = await getStaffWorkbook(user, boardDate);
    const workspaceKey = getWorkspaceKey(user);
    return NextResponse.json({
      boardDate,
      operatingRhythm: workbook.operatingRhythm,
      workbookId: workbook.id,
      workbookLabel: getWorkspaceWorkbookLabel(workspaceKey),
      workspaceKey
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load operating rhythm.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await recordWorkbookOperatingRhythmEvent(await getCurrentUser(), payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record operating rhythm.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
