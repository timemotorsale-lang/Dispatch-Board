import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  previewAppointmentAdminConfigurationImportForManager,
  type AppointmentAdminConfigurationImportPreviewInput
} from "@/server/services/appointment-admin-import-export";

function getConfigurationPortabilityStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Manager access required.") {
    return 403;
  }

  if (
    message.includes("required") ||
    message.includes("reason") ||
    message.includes("JSON") ||
    message.includes("schemaVersion")
  ) {
    return 400;
  }

  return 500;
}

function isImportPreviewPayload(
  payload: unknown
): payload is AppointmentAdminConfigurationImportPreviewInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentAdminConfigurationImportPreviewInput>;

  return Boolean(candidate.packageSnapshot && typeof candidate.reason === "string");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  if (!isImportPreviewPayload(payload)) {
    return NextResponse.json(
      {
        error: "Import package snapshot and preview reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const preview = await previewAppointmentAdminConfigurationImportForManager(user, payload);

    return NextResponse.json({ preview });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to preview appointment admin configuration import right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getConfigurationPortabilityStatus(message)
      }
    );
  }
}
