import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { sendAuthEmail } from "@/server/auth/email-delivery";
import { createStaffInvite, listStaffInvites } from "@/server/auth/staff-invite";

function statusFor(message: string) {
  if (message.includes("authorized manager")) return 403;
  if (message.includes("required") || message.includes("role")) return 400;
  return 500;
}

export async function GET() {
  const actor = await getCurrentUser();

  try {
    return NextResponse.json({ invites: await listStaffInvites(actor) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load staff invites.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const result = await createStaffInvite(actor, payload);
    const inviteUrl = new URL(result.inviteUrl, request.url).toString();
    const delivery = await sendAuthEmail({
      actionLabel: "Create password",
      actionUrl: inviteUrl,
      actorUserId: actor?.id,
      body: "A manager invited you to Time Motor Sales Command Control Center. Create your password from this secure one-use invite.",
      eventType: "STAFF_INVITE_EMAIL_DELIVERY",
      metadata: { inviteId: result.invite.id, inviteStatus: result.invite.status },
      preview: "Create your staff password from a secure invite.",
      subject: "Create your Time Motor Sales staff password",
      subjectId: result.invite.id,
      subjectType: "STAFF_INVITE",
      to: result.invite.email,
      toName: result.invite.name
    });

    return NextResponse.json({ ...result, delivery }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create staff invite.";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
