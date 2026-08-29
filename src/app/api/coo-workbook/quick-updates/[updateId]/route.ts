import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateCooWorkbookQuickUpdate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ updateId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { updateId } = await params;

  try {
    return NextResponse.json(await updateCooWorkbookQuickUpdate(await getCurrentUser(), updateId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update Quick Update.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
