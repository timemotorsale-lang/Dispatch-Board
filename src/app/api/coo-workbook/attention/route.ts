import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { recordWorkbookAttentionHeartbeat } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission") || message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("required") || message.includes("must be")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await recordWorkbookAttentionHeartbeat(await getCurrentUser(), payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record workbook activity time.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
