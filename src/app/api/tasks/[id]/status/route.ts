import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { updateTaskStatus } from "@/server/services/task-status-service";

type TaskStatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskStatusErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (message === "You do not have permission to update this task.") {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Blocked tasks require a blocker reason." ||
    message === "Task status payload must be an object." ||
    message.startsWith("Task status updates require") ||
    message.startsWith("Task status updates contain")
  ) {
    return 400;
  }

  return 500;
}

async function handleTaskStatusUpdate(request: Request, context: TaskStatusRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await updateTaskStatus(user, id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskStatusErrorStatus(message)
      }
    );
  }
}

export async function POST(request: Request, context: TaskStatusRouteContext) {
  return handleTaskStatusUpdate(request, context);
}

export async function PATCH(request: Request, context: TaskStatusRouteContext) {
  return handleTaskStatusUpdate(request, context);
}
