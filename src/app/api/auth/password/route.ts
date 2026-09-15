import { NextResponse } from "next/server";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { changeOwnPassword } from "@/server/auth/service";
import { createPrismaAuthStore } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

const authStore = createPrismaAuthStore(prisma);

function getPasswordChangeStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message === "Current password and new password are required." ||
    message === "Password must be at least 12 characters." ||
    message === "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol." ||
    message === "Password cannot use a common or default phrase." ||
    message === "New password must be different from the current password." ||
    message === "Unable to sign in with the provided credentials."
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const result = await changeOwnPassword(authStore, user, payload);

    if (user) {
      await prisma.enterpriseAuditEvent.create({
        data: {
          organizationId: INITIAL_ORGANIZATION.id,
          actorUserId: user.id,
          domain: "TEAM_SECURITY",
          subjectType: "USER",
          subjectId: user.id,
          eventType: "STAFF_PASSWORD_CHANGED",
          reason: "Staff member changed their own password.",
          metadata: {},
          correlationId: `team-security:staff_password_changed:${user.id}:${Date.now()}`
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change the password right now.";

    return NextResponse.json({ error: message }, { status: getPasswordChangeStatus(message) });
  }
}
