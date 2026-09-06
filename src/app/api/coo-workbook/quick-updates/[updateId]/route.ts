import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateCooWorkbookQuickUpdate } from "@/server/services/workday-workbook";
import { assertQuickUpdateCustomerLink, safeQuickUpdateError } from "@/server/services/workday-quick-update-context";

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
    const user = await getCurrentUser();
    await assertQuickUpdateCustomerLink(user, payload);
    return NextResponse.json(await updateCooWorkbookQuickUpdate(user, updateId, payload));
  } catch (error) {
    const message = safeQuickUpdateError(error, "Unable to update Quick Update. Please refresh the page and try again.");
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
