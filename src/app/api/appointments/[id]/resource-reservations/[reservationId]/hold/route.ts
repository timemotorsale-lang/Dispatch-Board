import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { holdAppointmentResourceCandidate } from "@/server/services/appointment-resource-candidate-availability-service";
import { getAppointmentVersionConflict } from "@/server/services/appointment-version-conflict";

type AppointmentResourceReservationHoldRouteContext = {
  params: Promise<{
    id: string;
    reservationId: string;
  }>;
};

function getResourceReservationHoldErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (
    message === "Appointment not found." ||
    message === "Resource candidate proposal not found for this appointment."
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
    message === "Resource reservation hold payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Resource reservation is required." ||
    message === "Expected appointment version is required." ||
    message === "Resource candidates can only be held for draft appointments." ||
    message === "Resource candidate hold requires a valid appointment time window." ||
    message === "Resource candidate is no longer available to hold." ||
    message === "Resource warning must be overridden before this candidate can be held." ||
    message === "Resource candidate proposal was already changed." ||
    message.includes("Resource hold")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentResourceReservationHoldRouteContext
) {
  const user = await getCurrentUser();
  const { id, reservationId } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Resource reservation hold payload must be an object.");
    }

    const reservation = await holdAppointmentResourceCandidate(user, id, {
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
        : "Unable to hold appointment resource candidate right now.";
    const conflict = getAppointmentVersionConflict(error);

    return NextResponse.json(
      {
        error: message,
        ...(conflict ? { conflict } : {})
      },
      {
        status: getResourceReservationHoldErrorStatus(message)
      }
    );
  }
}
