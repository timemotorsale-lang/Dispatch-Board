import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentResourceUpdateInput,
  updateAppointmentResourceForManager
} from "@/server/services/appointment-admin-settings";

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
    message.includes("capacity 1")
  ) {
    return 400;
  }

  return 500;
}

function isResourceUpdatePayload(payload: unknown): payload is Omit<AppointmentResourceUpdateInput, "resourceId"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceUpdateInput>;

  return Boolean(candidate.status && candidate.capacityMode && candidate.capacity && candidate.conflictPolicy);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { resourceId } = await context.params;

  if (!isResourceUpdatePayload(payload)) {
    return NextResponse.json(
      {
        error: "Resource status, capacity mode, capacity, and conflict policy are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateAppointmentResourceForManager(user, {
      ...payload,
      resourceId
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment resource right now.";

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
