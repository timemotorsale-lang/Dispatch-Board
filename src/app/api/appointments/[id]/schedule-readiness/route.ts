import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { previewAppointmentScheduleReadiness } from "@/server/services/appointment-schedule-readiness-service";

type AppointmentScheduleReadinessRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getScheduleReadinessErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment not found.") {
    return 404;
  }

  if (
    message === "Appointment schedule is not authorized." ||
    message === "Appointment command is not authorized."
  ) {
    return 403;
  }

  if (message === "Appointment id is required.") {
    return 400;
  }

  return 500;
}

export async function GET(
  _request: Request,
  context: AppointmentScheduleReadinessRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const readiness = await previewAppointmentScheduleReadiness(user, id);

    return NextResponse.json({
      readiness
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to preview appointment schedule readiness right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getScheduleReadinessErrorStatus(message)
      }
    );
  }
}
