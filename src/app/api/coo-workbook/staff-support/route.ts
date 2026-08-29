import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createStaffSupportAction } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const workbookId = url.searchParams.get("workbookId") ?? "";
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await createStaffSupportAction(await getCurrentUser(), workbookId, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create staff support action.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
