import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createAppointmentResourceOperatingWindowBatchForManager,
  type AppointmentResourceOperatingWindowBatchInput
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
    message.includes("Resource") ||
    message.includes("overlapping")
  ) {
    return 400;
  }

  return 500;
}

function isResourceOperatingWindowBatchPayload(
  payload: unknown
): payload is Omit<AppointmentResourceOperatingWindowBatchInput, "resourceId"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceOperatingWindowBatchInput>;

  return Boolean(
    Array.isArray(candidate.businessDays) &&
      candidate.businessDays.length > 0 &&
      candidate.opensAt &&
      candidate.closesAt &&
      candidate.validFrom &&
      candidate.reason &&
      typeof candidate.replaceExisting === "boolean"
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resourceId: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { resourceId } = await context.params;

  if (!isResourceOperatingWindowBatchPayload(payload)) {
    return NextResponse.json(
      {
        error:
          "Resource operating days, open time, close time, valid-from date, replace-existing choice, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await createAppointmentResourceOperatingWindowBatchForManager(user, {
      ...payload,
      resourceId
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to apply bulk appointment resource operating windows right now.";

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
