import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { replaceAppointmentResourceReservation } from "@/server/services/appointment-resource-planning-service";
import { getAppointmentVersionConflict } from "@/server/services/appointment-version-conflict";

type AppointmentResourceReservationReplaceRouteContext = {
  params: Promise<{
    id: string;
    reservationId: string;
  }>;
};

function getResourceReservationReplaceErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message === "Appointment not found." ||
    message === "Held resource reservation not found for replacement on this appointment."
  ) {
    return 404;
  }

  if (
    message === "Appointment schedule is not authorized." ||
    message === "Appointment command is not authorized."
  ) {
    return 403;
  }

  if (message === "Appointment version is stale.") {
    return 409;
  }

  if (
    message === "Resource reservation replacement payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Resource reservation is required." ||
    message === "Replacement resource candidate is required." ||
    message === "Expected appointment version is required." ||
    message === "Resource reservations can only be replaced on draft appointments." ||
    message ===
      "Resource reservations can only be replaced when a draft appointment has a held reservation or a scheduled appointment has a committed reservation." ||
    message === "Resource replacement requires a valid appointment time window." ||
    message === "Replacement resource candidate must be different from the held reservation." ||
    message === "Replacement resource candidate must be different from the current reservation." ||
    message.startsWith("Replacement resource candidate is not available for this requirement.") ||
    message === "Held resource reservation was already changed." ||
    message === "Resource reservation was already changed." ||
    message.includes("Resource replacement")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentResourceReservationReplaceRouteContext
) {
  const user = await getCurrentUser();
  const { id, reservationId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Resource reservation replacement payload must be an object.");
    }

    const replacement = await replaceAppointmentResourceReservation(user, id, {
      reservationId,
      resourceId: typeof payload.resourceId === "string" ? payload.resourceId : "",
      expectedAppointmentVersion:
        typeof payload.expectedAppointmentVersion === "number"
          ? payload.expectedAppointmentVersion
          : 0,
      reasonCode: typeof payload.reasonCode === "string" ? payload.reasonCode : "",
      reasonNotes: typeof payload.reasonNotes === "string" ? payload.reasonNotes : "",
      correlationId:
        typeof payload.correlationId === "string" ? payload.correlationId : null
    });

    return NextResponse.json(
      {
        replacement
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to replace appointment resource reservation right now.";
    const conflict = getAppointmentVersionConflict(error);

    return NextResponse.json(
      {
        error: message,
        ...(conflict ? { conflict } : {})
      },
      {
        status: getResourceReservationReplaceErrorStatus(message)
      }
    );
  }
}
