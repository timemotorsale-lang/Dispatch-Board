import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
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
      return NextResponse.json(await issuePasswordResetLink(actor, requestId));
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
