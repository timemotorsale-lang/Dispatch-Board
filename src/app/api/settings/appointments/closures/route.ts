import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentLocationClosureInput,
  createAppointmentLocationClosureForManager
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

function isClosurePayload(payload: unknown): payload is AppointmentLocationClosureInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentLocationClosureInput>;

  return Boolean(candidate.type && candidate.name && candidate.startsAt && candidate.endsAt && candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isClosurePayload(payload)) {
    return NextResponse.json(
      {
        error: "Closure type, name, start, end, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await createAppointmentLocationClosureForManager(user, payload);

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create appointment closure right now.";

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
