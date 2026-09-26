import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { resendStaffInvite, revokeStaffInvite } from "@/server/auth/staff-invite";

type RouteContext = {
  params: Promise<{
    inviteId: string;
  }>;
};

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("cannot") || message.includes("required")) return 400;
  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { inviteId } = await context.params;
  const action = payload && typeof payload === "object" && "action" in payload
    ? (payload as { action?: unknown }).action
    : null;

  try {
    if (action === "revoke") {
      return NextResponse.json(await revokeStaffInvite(actor, inviteId));
    }

    if (action === "resend") {
      return NextResponse.json(await resendStaffInvite(actor, inviteId));
    }

    return NextResponse.json({ error: "Invite action is required." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update staff invite.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
