import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { sendAuthEmail } from "@/server/auth/email-delivery";
import {
  issuePasswordResetLink,
  listPasswordRecoveryRequests,
  requestPasswordRecovery
} from "@/server/auth/password-recovery";

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("cannot") || message.includes("required") || message.includes("No staff account") || message.includes("Inactive")) return 400;
  return 500;
}

export async function GET() {
  const actor = await getCurrentUser();

  try {
    return NextResponse.json({ requests: await listPasswordRecoveryRequests(actor) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load password recovery requests.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  try {
    return NextResponse.json(await requestPasswordRecovery(payload), { status: 201 });
  } catch {
    return NextResponse.json(await requestPasswordRecovery(null), { status: 201 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const requestId = payload && typeof payload === "object" && "requestId" in payload
    ? (payload as { requestId?: unknown }).requestId
    : null;

  try {
    const result = await issuePasswordResetLink(actor, requestId);
    const resetUrl = new URL(result.resetUrl, request.url).toString();
    const delivery = await sendAuthEmail({
      actionLabel: "Reset password",
      actionUrl: resetUrl,
      actorUserId: actor?.id,
      body: "A manager approved your password recovery request. Use this secure one-use link to create a new password.",
      eventType: "PASSWORD_RESET_EMAIL_DELIVERY",
      metadata: { resetRequestId: result.reset.id, resetStatus: result.reset.status },
      preview: "Use a secure one-use link to reset your password.",
      subject: "Reset your Time Motor Sales staff password",
      subjectId: result.reset.id,
      subjectType: "PASSWORD_RESET_REQUEST",
      to: result.reset.email,
      toName: result.reset.userName
    });

    return NextResponse.json({ ...result, delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue password reset link.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
