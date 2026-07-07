import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  type AppointmentCatalogCodeEditorInput,
  updateAppointmentCatalogCodeForManager
} from "@/server/services/appointment-catalog-automation-admin";

function getCodeEditorErrorStatus(message: string) {
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
    message.includes("must") ||
    message.includes("invalid")
  ) {
    return 400;
  }

  return 500;
}

function isCodeEditorPayload(payload: unknown): payload is AppointmentCatalogCodeEditorInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentCatalogCodeEditorInput>;

  return Boolean(candidate.catalog && candidate.action && candidate.code && candidate.reason);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isCodeEditorPayload(payload)) {
    return NextResponse.json(
      {
        error: "Catalog type, action, code, and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const catalog = await updateAppointmentCatalogCodeForManager(user, payload);

    return NextResponse.json({ catalog });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update appointment catalog code.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getCodeEditorErrorStatus(message)
      }
    );
  }
}
