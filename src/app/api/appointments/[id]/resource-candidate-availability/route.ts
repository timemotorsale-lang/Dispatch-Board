import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { previewAppointmentResourceCandidateAvailability } from "@/server/services/appointment-resource-candidate-availability-service";

type AppointmentResourceCandidateAvailabilityRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getResourceCandidateAvailabilityErrorStatus(message: string) {
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

  if (
    message === "Appointment id is required." ||
    message === "Resource candidate availability requires a valid appointment time window."
  ) {
    return 400;
  }

  return 500;
}

export async function GET(
  _request: Request,
  context: AppointmentResourceCandidateAvailabilityRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const resourceCandidateAvailability =
      await previewAppointmentResourceCandidateAvailability(user, id);

    return NextResponse.json({
      resourceCandidateAvailability
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to preview appointment resource candidate availability right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getResourceCandidateAvailabilityErrorStatus(message)
      }
    );
  }
}
