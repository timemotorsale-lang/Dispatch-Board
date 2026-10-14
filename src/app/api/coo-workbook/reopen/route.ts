import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { reopenWorkbookDay } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { workbookId?: unknown } | null;

  try {
    if (typeof payload?.workbookId !== "string") throw new Error("Workbook id must be provided.");
    return NextResponse.json(await reopenWorkbookDay(await getCurrentUser(), payload.workbookId), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reopen workbook day.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
