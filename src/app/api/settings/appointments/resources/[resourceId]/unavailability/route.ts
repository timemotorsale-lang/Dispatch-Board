import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentResourceUnavailabilityInput,
  createAppointmentResourceUnavailabilityForManager
} from "@/server/services/appointment-admin-settings";

function getAppointmentAdminMutationStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("valid date") ||
    message.includes("end after") ||
    message.includes("must be")
  ) {
    return 400;
  }

  return 500;
}

function isResourceUnavailabilityPayload(
  payload: unknown
): payload is Omit<AppointmentResourceUnavailabilityInput, "resourceId"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceUnavailabilityInput>;

  return Boolean(candidate.type && candidate.startsAt && candidate.endsAt && candidate.reason);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { resourceId } = await context.params;

  if (!isResourceUnavailabilityPayload(payload)) {
    return NextResponse.json(
      {
        error: "Resource unavailability type, start, end, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await createAppointmentResourceUnavailabilityForManager(user, {
      ...payload,
      resourceId
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create appointment resource unavailability right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentAdminMutationStatus(message)
      }
    );
  }
}
