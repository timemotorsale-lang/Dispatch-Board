import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateWorkbookDailyFocusItem } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("closed")) return 409;
  if (message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { itemId } = await params;

  try {
    return NextResponse.json(await updateWorkbookDailyFocusItem(await getCurrentUser(), itemId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update Daily Focus item.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
