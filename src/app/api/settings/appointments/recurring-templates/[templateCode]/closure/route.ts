import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  applyRecurringAppointmentClosureTemplateForManager,
  type AppointmentRecurringTemplateClosureApplyInput
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
    message.includes("format") ||
    message.includes("already exists") ||
    message.includes("Recurring template")
  ) {
    return 400;
  }

  return 500;
}

function isTemplateApplyPayload(
  payload: unknown
): payload is Omit<AppointmentRecurringTemplateClosureApplyInput, "templateCode"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AppointmentRecurringTemplateClosureApplyInput>;

  return Boolean(candidate.reason);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ templateCode: string }> }
) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { templateCode } = await context.params;

  if (!isTemplateApplyPayload(payload)) {
    return NextResponse.json(
      {
        error: "Template date and reason are required."
      },
      { status: 400 }
    );
  }

  try {
    const settings = await applyRecurringAppointmentClosureTemplateForManager(user, {
      templateCode,
      dateIso: payload.dateIso,
      reason: payload.reason
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create appointment closure from recurring template right now.";

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
