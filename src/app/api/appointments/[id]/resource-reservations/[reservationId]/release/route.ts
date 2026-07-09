import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { releaseAppointmentResourceReservation } from "@/server/services/appointment-resource-candidate-availability-service";
import { getAppointmentVersionConflict } from "@/server/services/appointment-version-conflict";

type AppointmentResourceReservationReleaseRouteContext = {
  params: Promise<{
    id: string;
    reservationId: string;
  }>;
};

function getResourceReservationReleaseErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message === "Appointment not found." ||
    message === "Resource reservation not found for release on this appointment."
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
    message === "Resource reservation release payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Resource reservation is required." ||
    message === "Expected appointment version is required." ||
    message === "Resource reservations can only be released from active appointments." ||
    message === "Resource reservation was already changed." ||
    message.includes("Resource release")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentResourceReservationReleaseRouteContext
) {
  const user = await getCurrentUser();
  const { id, reservationId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Resource reservation release payload must be an object.");
    }

    const reservation = await releaseAppointmentResourceReservation(user, id, {
      reservationId,
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
        reservation
      },
      {
        status: 200
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to release appointment resource reservation right now.";
    const conflict = getAppointmentVersionConflict(error);

    return NextResponse.json(
      {
        error: message,
        ...(conflict ? { conflict } : {})
      },
      {
        status: getResourceReservationReleaseErrorStatus(message)
      }
    );
  }
}
