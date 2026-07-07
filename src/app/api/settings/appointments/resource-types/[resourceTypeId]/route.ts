import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentResourceTypeUpdateInput,
  updateAppointmentResourceTypeForManager
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
    message.includes("Resource type")
  ) {
    return 400;
  }

  return 500;
}

function isResourceTypePayload(
  payload: unknown
): payload is Omit<AppointmentResourceTypeUpdateInput, "resourceTypeId"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceTypeUpdateInput>;

  return Boolean(
    candidate.name &&
      candidate.defaultCapacityMode &&
      candidate.defaultCapacity &&
      candidate.defaultConflictPolicy &&
      typeof candidate.isActive === "boolean"
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resourceTypeId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { resourceTypeId } = await context.params;

  if (!isResourceTypePayload(payload)) {
    return NextResponse.json(
      {
        error:
          "Resource type name, capacity mode, capacity, conflict policy, and status are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateAppointmentResourceTypeForManager(user, {
      ...payload,
      resourceTypeId
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment resource type right now.";

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
