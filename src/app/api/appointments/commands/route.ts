import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { submitAndExecuteAppointmentCommand } from "@/server/services/appointment-command-execution-service";

function getAppointmentCommandErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Appointment command is not authorized.") {
    return 403;
  }

  if (message === "Appointment not found.") {
    return 404;
  }

  if (message === "Idempotency key already used for a different appointment command.") {
    return 409;
  }

  if (
    message === "Appointment command payload must be an object." ||
    message === "Appointment command payload must be a JSON object." ||
    message === "Appointment command requires an organization and location." ||
    message.startsWith("Appointment command") ||
    message.startsWith("CREATE_DRAFT") ||
    message.includes("appointment commands require")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);

  try {
    const result = await submitAndExecuteAppointmentCommand(user, payload);

    return NextResponse.json(
      {
        command: result.command,
        duplicate: result.duplicate,
        accepted: result.accepted,
        conflict: result.conflict,
        execution: result.execution
      },
      {
        status: result.conflict ? 409 : result.duplicate ? 200 : 202
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit the appointment command right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getAppointmentCommandErrorStatus(message)
      }
    );
  }
}
