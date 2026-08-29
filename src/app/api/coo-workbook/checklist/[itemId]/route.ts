import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateCooWorkbookChecklistItem } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("must be") || message.includes("unsupported")) return 400;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const payload = await request.json().catch(() => null);
  const { itemId } = await params;

  try {
    return NextResponse.json(await updateCooWorkbookChecklistItem(await getCurrentUser(), itemId, payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update checklist item.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
