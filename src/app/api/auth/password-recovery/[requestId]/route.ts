import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { sendAuthEmail } from "@/server/auth/email-delivery";
import { issuePasswordResetLink, revokePasswordRecovery } from "@/server/auth/password-recovery";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("cannot") || message.includes("required") || message.includes("No staff account") || message.includes("Inactive")) return 400;
  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { requestId } = await context.params;
  const action = payload && typeof payload === "object" && "action" in payload
    ? (payload as { action?: unknown }).action
    : null;

  try {
    if (action === "issue") {
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
    }

    if (action === "revoke") {
      return NextResponse.json(await revokePasswordRecovery(actor, requestId));
    }

    return NextResponse.json({ error: "Password recovery action is required." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update password recovery request.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
