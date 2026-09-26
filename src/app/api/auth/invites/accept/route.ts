import { NextResponse } from "next/server";

import { acceptStaffInvite } from "@/server/auth/staff-invite";

function statusFor(message: string) {
  if (message.includes("invalid") || message.includes("required") || message.includes("Password")) return 400;
  if (message.includes("expired") || message.includes("revoked") || message.includes("already")) return 409;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await acceptStaffInvite(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept staff invite.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
