import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateWorkbookCarryover } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission") || message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("must be") || message.includes("not supported") || message.includes("closed")) return 400;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ carryoverId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { carryoverId } = await params;

  try {
    return NextResponse.json(await updateWorkbookCarryover(await getCurrentUser(), carryoverId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update carryover.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
