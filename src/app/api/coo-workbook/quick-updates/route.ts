import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createCooWorkbookQuickUpdate } from "@/server/services/workday-workbook";

function statusFor(message: string) {
  if (message === "Authentication required.") return 401;
  if (message.includes("required") || message.includes("must be") || message.includes("not supported")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const boardDate = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await createCooWorkbookQuickUpdate(await getCurrentUser(), boardDate, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save Quick Update.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
