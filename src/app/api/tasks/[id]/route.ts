import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTaskReadModelById } from "@/server/services/task-read";
import { updateTaskMetadata } from "@/server/services/task-metadata-service";

type TaskReadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTaskReadErrorStatus(message: string) {
  if (message === "Authentication required.") {
    return 401;
  }

  if (message === "Task not found.") {
    return 404;
  }

  if (message === "Board access required.") {
    return 403;
  }

  if (
    message === "Task id is required." ||
    message === "Only managers can change the due date." ||
    message === "Task metadata payload must be an object." ||
    message === "Task metadata updates require at least one field." ||
    message === "Task metadata updates did not change any saved fields." ||
    message === "Task metadata updates require dueAt to be a valid timestamp." ||
    message === "Task metadata updates require title to be a string when provided." ||
    message === "Task metadata updates require description to be a string when provided." ||
    message === "Task metadata updates require vehicleReference to be a string when provided." ||
    message === "Task metadata updates require customerReference to be a string when provided." ||
    message === "Task title is required." ||
    message.startsWith("Task metadata title must be ") ||
    message === "Task metadata updates require workflowArea to be a valid execution path." ||
    message.startsWith("Task metadata description must be ") ||
    message.startsWith("Task metadata vehicleReference must be ") ||
    message.startsWith("Task metadata customerReference must be ") ||
    message.startsWith("Task metadata updates contain")
  ) {
    return 400;
  }

  if (message === "You do not have permission to update this task.") {
    return 403;
  }

  return 500;
}

export async function GET(_request: Request, context: TaskReadRouteContext) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const task = await getTaskReadModelById(user, id);

    if (!task) {
      return NextResponse.json(
        {
          error: "Task not found."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskReadErrorStatus(message)
      }
    );
  }
}

export async function PATCH(request: Request, context: TaskReadRouteContext) {
  const user = await getCurrentUser();
  const payload = await request.json().catch(() => null);
  const { id } = await context.params;

  try {
    const task = await updateTaskMetadata(user, id, payload);

    return NextResponse.json({ task });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the task right now.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: getTaskReadErrorStatus(message)
      }
    );
  }
}
