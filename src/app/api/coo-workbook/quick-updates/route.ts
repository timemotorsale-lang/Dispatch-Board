import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCooWorkbookQuickUpdate, currentWorkdayBoardDate } from "@/server/services/workday-workbook";
import { assertQuickUpdateCustomerLink, safeQuickUpdateError } from "@/server/services/workday-quick-update-context";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("permission")) return 403;
  if (message.includes("required") || message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? currentWorkdayBoardDate();
  const payload = await request.json().catch(() => null);

  try {
    const user = await getCurrentUser();
    await assertQuickUpdateCustomerLink(user, payload);
    return NextResponse.json(await createCooWorkbookQuickUpdate(user, boardDate, payload), { status: 201 });
  } catch (error) {
    const message = safeQuickUpdateError(error, "Unable to save Quick Update. Please refresh the page and try again.");
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
