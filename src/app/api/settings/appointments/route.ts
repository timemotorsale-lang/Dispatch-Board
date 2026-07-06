import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentAdminSettingsInput,
  getAppointmentAdminSettingsForManager,
  updateAppointmentAdminSettings
} from "@/server/services/appointment-admin-settings";

function getAppointmentSettingsErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("HH:mm") ||
    message.includes("valid timezone") ||
    message.includes("must be") ||
    message.includes("At least one appointment operating day")
  ) {
    return 400;
  }

  return 500;
}

function isAppointmentAdminSettingsPayload(payload: unknown): payload is AppointmentAdminSettingsInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentAdminSettingsInput>;

  return Boolean(
    candidate.location &&
      typeof candidate.location === "object" &&
      Array.isArray(candidate.operatingWindows)
  );
}

export async function GET() {
  const user = await getCurrentUser();

  try {
    const settings = await getAppointmentAdminSettingsForManager(user);

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load appointment settings right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentSettingsErrorStatus(message)
      }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isAppointmentAdminSettingsPayload(payload)) {
    return NextResponse.json(
      {
        error: "Appointment location and operating windows are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await updateAppointmentAdminSettings(user, payload);

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment settings right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentSettingsErrorStatus(message)
      }
    );
  }
}
