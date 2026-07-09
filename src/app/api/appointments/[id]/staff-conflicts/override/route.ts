import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { overrideAppointmentStaffWarning } from "@/server/services/appointment-staff-conflict-preview-service";
import { getAppointmentVersionConflict } from "@/server/services/appointment-version-conflict";

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
    message === "Proposed appointment start must be a valid date." ||
    message === "Proposed appointment end must be a valid date." ||
    message.includes("Staff warning override")
  ) {
    return 400;
  }

  return 500;
}

function parseOptionalDatePayload(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
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
        typeof payload.correlationId === "string" ? payload.correlationId : null,
      proposedStartsAt: parseOptionalDatePayload(
        "proposedStartsAt" in payload ? payload.proposedStartsAt : null,
        "Proposed appointment start"
      ),
      proposedEndsAt: parseOptionalDatePayload(
        "proposedEndsAt" in payload ? payload.proposedEndsAt : null,
        "Proposed appointment end"
      ),
      proposedSchedulingTimezone:
        typeof payload.proposedSchedulingTimezone === "string"
          ? payload.proposedSchedulingTimezone
          : null
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
    const conflict = getAppointmentVersionConflict(error);

    return NextResponse.json(
      {
        error: message,
        ...(conflict ? { conflict } : {})
      },
      {
        status: getStaffWarningOverrideErrorStatus(message)
      }
    );
  }
}
