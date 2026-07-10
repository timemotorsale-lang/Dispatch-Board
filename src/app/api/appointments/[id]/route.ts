import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getAppointmentReadModelById } from "@/server/services/appointment-read-service";

type AppointmentDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getAppointmentDetailErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment id is required.") {
    return 400;
  }

  if (message === "Appointment detail is not available.") {
    return 404;
  }

  return 500;
}

export async function GET(_request: Request, context: AppointmentDetailRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const appointment = await getAppointmentReadModelById(user, id);

    return NextResponse.json({
      appointment
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load appointment detail right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentDetailErrorStatus(message)
      }
    );
  }
}
