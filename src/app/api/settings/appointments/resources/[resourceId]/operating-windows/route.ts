import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createAppointmentResourceOperatingWindowForManager,
  type AppointmentResourceOperatingWindowInput
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
    message.includes("must be") ||
    message.includes("valid") ||
    message.includes("Resource")
  ) {
    return 400;
  }

  return 500;
}

function isResourceOperatingWindowPayload(
  payload: unknown
): payload is Omit<AppointmentResourceOperatingWindowInput, "resourceId"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceOperatingWindowInput>;

  return Boolean(
    candidate.businessDay &&
      candidate.opensAt &&
      candidate.closesAt &&
      candidate.validFrom &&
      candidate.reason
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { resourceId } = await context.params;

  if (!isResourceOperatingWindowPayload(payload)) {
    return NextResponse.json(
      {
        error:
          "Resource operating day, open time, close time, valid-from date, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await createAppointmentResourceOperatingWindowForManager(user, {
      ...payload,
      resourceId
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create appointment resource operating window right now.";

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
