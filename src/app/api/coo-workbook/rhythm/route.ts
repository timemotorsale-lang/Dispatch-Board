import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceWorkbookLabel, getWorkspaceKey } from "@/server/auth/navigation";
import { currentWorkdayBoardDate, getCooWorkbook, getStaffWorkbook, recordWorkbookOperatingRhythmEvent } from "@/server/services/workday-workbook";

const emptyOperatingSignals = {
  approvalCount: 0,
  handoffCount: 0,
  reportExceptions: 0
};

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission") || message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("not supported")) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");
    const boardDate = currentWorkdayBoardDate();
    const { searchParams } = new URL(request.url);
    const requestedScope = searchParams.get("scope")?.toUpperCase();
    const staffWorkbook = await getStaffWorkbook(user, boardDate);
    const cooWorkbook = requestedScope === "COO" || !staffWorkbook.operatingRhythm.startTheDay.complete
      ? await getCooWorkbook(user, boardDate, emptyOperatingSignals).catch(() => null)
      : null;
    const workbook = requestedScope === "COO" && cooWorkbook
      ? cooWorkbook
      : cooWorkbook?.operatingRhythm.startTheDay.complete
        ? cooWorkbook
        : staffWorkbook;
    const workspaceKey = getWorkspaceKey(user);
    return NextResponse.json({
      boardDate,
      operatingRhythm: workbook.operatingRhythm,
      workbookId: workbook.id,
      workbookLabel: workbook.scope === "COO" ? "COO Workbook" : getWorkspaceWorkbookLabel(workspaceKey),
      workbookScope: workbook.scope,
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
