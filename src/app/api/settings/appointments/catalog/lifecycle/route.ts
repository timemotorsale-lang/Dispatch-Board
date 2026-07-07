import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentCatalogPurposeLifecycleInput,
  updateAppointmentCatalogPurposeLifecycleForManager
} from "@/server/services/appointment-catalog-automation-admin";

function getLifecycleErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("configured") ||
    message.includes("cannot") ||
    message.includes("supported") ||
    message.includes("invalid") ||
    message.includes("must")
  ) {
    return 400;
  }

  return 500;
}

function isLifecyclePayload(payload: unknown): payload is AppointmentCatalogPurposeLifecycleInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentCatalogPurposeLifecycleInput>;

  return Boolean(candidate.action && candidate.purposeCode && candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isLifecyclePayload(payload)) {
    return NextResponse.json(
      {
        error: "Lifecycle action, purpose code, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const catalog = await updateAppointmentCatalogPurposeLifecycleForManager(user, payload);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update appointment purpose lifecycle right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getLifecycleErrorStatus(message)
      }
    );
  }
}
