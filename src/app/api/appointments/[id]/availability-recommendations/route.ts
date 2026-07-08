import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  recommendAppointmentAvailability,
  type AppointmentAvailabilityRecommendationOptions
} from "@/server/services/appointment-availability-recommendation-service";

type AppointmentAvailabilityRecommendationRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getAvailabilityRecommendationErrorStatus(message: string) {
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
    message === "Proposed appointment end must be a valid date." ||
    message === "Availability recommendation maximum candidates must be a positive integer." ||
    message === "Availability recommendation search horizon must be a positive integer."
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

function parseOptionalPositiveInteger(value: string | null, label: string) {
  if (!value) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return number;
}

function getAvailabilityRecommendationOptions(request: Request) {
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
  const maximumCandidates = parseOptionalPositiveInteger(
    url.searchParams.get("maximumCandidates"),
    "Availability recommendation maximum candidates"
  );
  const searchHorizonDays = parseOptionalPositiveInteger(
    url.searchParams.get("searchHorizonDays"),
    "Availability recommendation search horizon"
  );

  if (
    !proposedStartsAt &&
    !proposedEndsAt &&
    !proposedSchedulingTimezone &&
    !maximumCandidates &&
    !searchHorizonDays
  ) {
    return null;
  }

  return {
    proposedStartsAt,
    proposedEndsAt,
    proposedSchedulingTimezone,
    maximumCandidates: maximumCandidates ?? undefined,
    searchHorizonDays: searchHorizonDays ?? undefined
  } satisfies AppointmentAvailabilityRecommendationOptions;
}

export async function GET(
  request: Request,
  context: AppointmentAvailabilityRecommendationRouteContext
) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const options = getAvailabilityRecommendationOptions(request);
    const availabilityRecommendations = options
      ? await recommendAppointmentAvailability(user, id, undefined, undefined, options)
      : await recommendAppointmentAvailability(user, id);

    return NextResponse.json({
      availabilityRecommendations
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load appointment availability recommendations right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAvailabilityRecommendationErrorStatus(message)
      }
    );
  }
}
