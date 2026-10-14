import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { createAppointmentDraftFromTask } from "@/server/services/task-appointment-service";

type TaskAppointmentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskAppointmentErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (
    message === "Board access required." ||
    message === "You do not have permission to create an appointment from this task." ||
    message === "Appointment command is not authorized."
  ) {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Task appointment payload must be an object." ||
    message === "Task appointment reason is required." ||
    message === "Task appointment local date must use YYYY-MM-DD." ||
    message === "Task appointment start time must use HH:MM." ||
    message === "Task appointment start time must be a valid local time." ||
    message === "Task appointment title must be text." ||
    message === "Task appointment reason must be text." ||
    message === "Task appointment idempotency key must be text." ||
    message.startsWith("Task appointment customer") ||
    message.startsWith("Task appointment delivery notes") ||
    message.startsWith("Task appointment duration") ||
    message.startsWith("Task appointment local date") ||
    message.startsWith("Task appointment purpose code") ||
    message.startsWith("Task appointment title cannot exceed") ||
    message.startsWith("Task appointment reason cannot exceed") ||
    message.startsWith("Task appointment start time") ||
    message.startsWith("Task appointment vehicle") ||
    message.startsWith("Task appointment idempotency key cannot exceed") ||
    message.startsWith("Appointment command") ||
    message.startsWith("CREATE_DRAFT")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request, context: TaskAppointmentRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const appointment = await createAppointmentDraftFromTask(user, id, payload);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create an appointment from this task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskAppointmentErrorStatus(message)
      }
    );
  }
}
