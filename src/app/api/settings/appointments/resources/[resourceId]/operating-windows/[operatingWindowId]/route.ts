import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { deleteAppointmentResourceOperatingWindowForManager } from "@/server/services/appointment-admin-settings";

function getAppointmentAdminMutationStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("must be") ||
    message.includes("valid") ||
    message.includes("Resource")
  ) {
    return 400;
  }

  return 500;
}

function getRequiredReason(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const reason = (payload as { reason?: unknown }).reason;

  return typeof reason === "string" && reason.trim() ? reason : null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resourceId: string; operatingWindowId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const reason = getRequiredReason(payload);
  const { resourceId, operatingWindowId } = await context.params;

  if (!reason) {
    return NextResponse.json(
      {
        error: "A resource operating window removal reason is required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await deleteAppointmentResourceOperatingWindowForManager(user, {
      resourceId,
      operatingWindowId,
      reason
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete appointment resource operating window right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentAdminMutationStatus(message)
      }
    );
  }
}
