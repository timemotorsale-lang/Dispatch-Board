import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createStaffInvite } from "@/server/auth/staff-invite";

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("required") || message.includes("role")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await createStaffInvite(actor, payload), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create staff invite.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
