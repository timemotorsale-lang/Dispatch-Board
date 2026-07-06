import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  activateAppointmentCatalogDraftForManager,
  type AppointmentCatalogActivateInput
} from "@/server/services/appointment-catalog-automation-admin";

function getActivationErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("No draft") ||
    message.includes("must")
  ) {
    return 400;
  }

  return 500;
}

function isActivationPayload(payload: unknown): payload is AppointmentCatalogActivateInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentCatalogActivateInput>;

  return Boolean(candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isActivationPayload(payload)) {
    return NextResponse.json(
      {
        error: "Activation reason is required."
      },
      { status: 400 }
    );
  }

  try {
    const catalog = await activateAppointmentCatalogDraftForManager(user, payload);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to activate appointment catalog draft right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getActivationErrorStatus(message)
      }
    );
  }
}
