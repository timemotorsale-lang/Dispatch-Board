import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  createAppointmentResourceTypeForManager,
  type AppointmentResourceTypeCreateInput
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
    message.includes("already exists") ||
    message.includes("Resource type")
  ) {
    return 400;
  }

  return 500;
}

function isResourceTypeCreatePayload(payload: unknown): payload is AppointmentResourceTypeCreateInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentResourceTypeCreateInput>;

  return Boolean(
    candidate.code &&
      candidate.name &&
      candidate.kind &&
      candidate.defaultCapacityMode &&
      candidate.defaultCapacity &&
      candidate.defaultConflictPolicy &&
      candidate.visibilityClass
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isResourceTypeCreatePayload(payload)) {
    return NextResponse.json(
      {
        error:
          "Resource type code, name, kind, capacity mode, capacity, conflict policy, and visibility are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await createAppointmentResourceTypeForManager(user, payload);

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create appointment resource type right now.";

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
