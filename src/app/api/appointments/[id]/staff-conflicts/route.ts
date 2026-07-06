import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { previewAppointmentStaffConflicts } from "@/server/services/appointment-staff-conflict-preview-service";

type AppointmentStaffConflictPreviewRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getStaffConflictPreviewErrorStatus(message: string) {
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
  context: AppointmentStaffConflictPreviewRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const staffConflicts = await previewAppointmentStaffConflicts(user, id);

    return NextResponse.json({
      staffConflicts
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to preview appointment staff conflicts right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getStaffConflictPreviewErrorStatus(message)
      }
    );
  }
}
