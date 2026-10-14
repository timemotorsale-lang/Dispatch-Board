import { NextResponse } from "next/server";

import { sendAuthEmail } from "@/server/auth/email-delivery";
import { completePasswordReset } from "@/server/auth/password-recovery";

function statusFor(message: string) {
  if (message.includes("invalid") || message.includes("expired") || message.includes("revoked") || message.includes("used")) return 400;
  if (message.includes("Password") || message.includes("required")) return 400;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    const result = await completePasswordReset(payload);
    const delivery = await sendAuthEmail({
      actorUserId: result.userId,
      body: "Your Time Motor Sales staff password was reset with a manager-approved recovery link. All previous sign-ins were closed.",
      eventType: "PASSWORD_RESET_COMPLETED_EMAIL_DELIVERY",
      metadata: {},
      preview: "Your staff password was reset and previous sign-ins were closed.",
      subject: "Your staff password was reset",
      subjectId: result.userId,
      to: result.email,
      toName: result.userName
    });

    return NextResponse.json({ ...result, delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
