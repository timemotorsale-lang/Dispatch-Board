import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateStaffSupportAction } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("Manager access")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("not supported") || message.includes("must be")) return 400;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ actionId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { actionId } = await params;

  try {
    return NextResponse.json(await updateStaffSupportAction(await getCurrentUser(), actionId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update staff support action.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
