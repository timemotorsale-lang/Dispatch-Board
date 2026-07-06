import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  previewAppointmentStaffConflicts,
  type AppointmentStaffConflictPreviewOptions
} from "@/server/services/appointment-staff-conflict-preview-service";

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

  if (
    message === "Appointment id is required." ||
    message === "Proposed appointment start must be a valid date." ||
    message === "Proposed appointment end must be a valid date."
  ) {
    return 400;
  }

  return 500;
}

function parseOptionalDateParam(value: string | null, label: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function getProposedStaffConflictOptions(request: Request) {
  const url = new URL(request.url);
  const proposedStartsAt = parseOptionalDateParam(
    url.searchParams.get("proposedStartsAt"),
    "Proposed appointment start"
  );
  const proposedEndsAt = parseOptionalDateParam(
    url.searchParams.get("proposedEndsAt"),
    "Proposed appointment end"
  );
  const proposedSchedulingTimezone = url.searchParams.get("proposedSchedulingTimezone");

  if (!proposedStartsAt && !proposedEndsAt && !proposedSchedulingTimezone) {
    return null;
  }

  return {
    proposedStartsAt,
    proposedEndsAt,
    proposedSchedulingTimezone
  } satisfies AppointmentStaffConflictPreviewOptions;
}

export async function GET(
  request: Request,
  context: AppointmentStaffConflictPreviewRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const proposedOptions = getProposedStaffConflictOptions(request);
    const staffConflicts = proposedOptions
      ? await previewAppointmentStaffConflicts(
          user,
          id,
          undefined,
          undefined,
          proposedOptions
        )
      : await previewAppointmentStaffConflicts(user, id);

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
