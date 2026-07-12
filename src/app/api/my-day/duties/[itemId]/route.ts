import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateStaffDayDuty } from "@/server/services/staff-day";

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    return NextResponse.json({ item: await updateStaffDayDuty(await getCurrentUser(), itemId, await request.json().catch(() => null)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update this daily duty.";
    const status = message === "Authentication required." ? 401 : message.includes("not found") ? 404 : message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
