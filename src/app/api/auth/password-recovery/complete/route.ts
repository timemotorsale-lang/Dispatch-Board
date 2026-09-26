import { NextResponse } from "next/server";

import { completePasswordReset } from "@/server/auth/password-recovery";

function statusFor(message: string) {
  if (message.includes("invalid") || message.includes("expired") || message.includes("revoked") || message.includes("used")) return 400;
  if (message.includes("Password") || message.includes("required")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await completePasswordReset(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
