import { NextResponse } from "next/server";

import { sendAuthEmail } from "@/server/auth/email-delivery";
import { acceptStaffInvite } from "@/server/auth/staff-invite";

function statusFor(message: string) {
  if (message.includes("invalid") || message.includes("required") || message.includes("Password")) return 400;
  if (message.includes("expired") || message.includes("revoked") || message.includes("already")) return 409;
  return 500;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    const result = await acceptStaffInvite(payload);
    const delivery = await sendAuthEmail({
      actorUserId: result.user.id,
      body: "Your Time Motor Sales staff account was created from an approved invite. You can now sign in to your assigned workspace.",
      eventType: "STAFF_INVITE_ACCEPTED_EMAIL_DELIVERY",
      metadata: {},
      preview: "Your staff account was created.",
      subject: "Your staff account is ready",
      subjectId: result.user.id,
      to: result.user.email,
      toName: result.user.name
    });

    return NextResponse.json({ ...result, delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept staff invite.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
