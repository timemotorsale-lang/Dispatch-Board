import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { overrideAppointmentStaffWarning } from "@/server/services/appointment-staff-conflict-preview-service";

type AppointmentStaffWarningOverrideRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getStaffWarningOverrideErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment not found.") {
    return 404;
  }

  if (
    message === "Appointment schedule is not authorized." ||
    message === "Only an authorized manager can override appointment warnings."
  ) {
    return 403;
  }

  if (message === "Appointment version is stale.") {
    return 409;
  }

  if (
    message === "Staff warning override payload must be an object." ||
    message === "Appointment id is required." ||
    message === "Expected appointment version is required." ||
    message === "Staff warning overrides can only be recorded for draft appointments." ||
    message === "Staff owner does not have a warning to override." ||
    message === "Staff hard blocks cannot be overridden." ||
    message.includes("Staff warning override")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: Request,
  context: AppointmentStaffWarningOverrideRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);

  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Staff warning override payload must be an object.");
    }

    const staffWarningOverride = await overrideAppointmentStaffWarning(user, id, {
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
        staffWarningOverride
      },
      {
        status: 200
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to override appointment staff warning right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getStaffWarningOverrideErrorStatus(message)
      }
    );
  }
}
