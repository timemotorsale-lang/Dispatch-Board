import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { previewAppointmentResourcePlanning } from "@/server/services/appointment-resource-planning-service";

type AppointmentResourcePlanningRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getResourcePlanningErrorStatus(message: string) {
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
  context: AppointmentResourcePlanningRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const resourcePlanning = await previewAppointmentResourcePlanning(user, id);

    return NextResponse.json({
      resourcePlanning
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to preview appointment resource planning right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getResourcePlanningErrorStatus(message)
      }
    );
  }
}
