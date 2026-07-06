import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentCatalogPurposeDraftInput,
  saveAppointmentCatalogDraftForManager
} from "@/server/services/appointment-catalog-automation-admin";

function getDraftErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("not configured") ||
    message.includes("must")
  ) {
    return 400;
  }

  return 500;
}

function isDraftPayload(payload: unknown): payload is AppointmentCatalogPurposeDraftInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentCatalogPurposeDraftInput>;

  return Boolean(candidate.purposeCode && candidate.reason && candidate.changes);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isDraftPayload(payload)) {
    return NextResponse.json(
      {
        error: "Purpose, change reason, and draft changes are required."
      },
      { status: 400 }
    );
  }

  try {
    const catalog = await saveAppointmentCatalogDraftForManager(user, payload);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save appointment catalog draft right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getDraftErrorStatus(message)
      }
    );
  }
}
